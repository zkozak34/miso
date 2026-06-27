package server

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/docker"
	"github.com/zeynelkozak/miso/internal/store"
)

// buildLog is a concurrency-safe buffer that captures the daemon's build
// output so the UI can show it while a deploy is in progress.
type buildLog struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *buildLog) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *buildLog) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func (s *Server) newBuildLog(appID string) *buildLog {
	lb := &buildLog{}
	s.mu.Lock()
	s.buildLogs[appID] = lb
	s.mu.Unlock()
	return lb
}

func (s *Server) getBuildLog(appID string) *buildLog {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.buildLogs[appID]
}

func (s *Server) handleApplicationAction(w http.ResponseWriter, r *http.Request) {
	aid := chi.URLParam(r, "aid")
	action := chi.URLParam(r, "action")

	app, err := s.store.GetApplication(aid)
	if err != nil {
		writeError(w, err)
		return
	}
	if s.docker == nil {
		writeStatus(w, http.StatusServiceUnavailable, map[string]string{"error": "Docker daemon erişilemiyor"})
		return
	}

	switch action {
	case "deploy":
		s.deploy(w, app)
	case "stop":
		s.stopApp(w, app)
	case "restart":
		s.restartApp(w, app)
	default:
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
	}
}

func (s *Server) deploy(w http.ResponseWriter, app store.Application) {
	if strings.TrimSpace(app.RepoURL) == "" {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "repository URL gerekli"})
		return
	}

	token, _ := s.store.ApplicationAuthToken(app.ID)
	a, err := s.store.SetApplicationStatus(app.ID, store.StatusBuilding)
	if err != nil {
		writeError(w, err)
		return
	}

	image := store.ImageName(app.ContainerName)
	gitURL := buildGitURL(app.RepoURL, app.Branch, token)
	lb := s.newBuildLog(app.ID)
	fmt.Fprintf(lb, "==> %s imajı %s reposundan derleniyor\n", image, app.RepoURL)

	go s.runDeploy(app, image, gitURL, lb)

	writeJSON(w, a)
}

// runDeploy builds the image then (re)creates and starts the container,
// recording the result in the store. It runs detached from the request.
func (s *Server) runDeploy(app store.Application, image, gitURL string, lb *buildLog) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	labels := map[string]string{"miso.app": app.ID, "miso.managed": "true"}

	if err := s.docker.Build(ctx, docker.BuildSpec{
		Image:      image,
		GitURL:     gitURL,
		Dockerfile: app.DockerfilePath,
		BuildArgs:  app.BuildArgs,
		Labels:     labels,
	}, lb); err != nil {
		s.failDeploy(app.ID, lb, "Derleme başarısız", err)
		return
	}

	fmt.Fprintf(lb, "\n==> %s container'ı başlatılıyor\n", app.ContainerName)
	cid, err := s.docker.Run(ctx, docker.RunSpec{
		Image:         image,
		Name:          app.ContainerName,
		HostPort:      derefPort(app.HostPort),
		ContainerPort: derefPort(app.ContainerPort),
		Labels:        labels,
	})
	if err != nil {
		s.failDeploy(app.ID, lb, "Container başlatılamadı", err)
		return
	}

	if _, err := s.store.MarkApplicationDeployed(app.ID, image, cid); err != nil {
		log.Printf("deploy: mark deployed %s: %v", app.ID, err)
		return
	}
	fmt.Fprintf(lb, "==> Dağıtım tamamlandı\n")
}

func (s *Server) failDeploy(appID string, lb *buildLog, stage string, cause error) {
	msg := fmt.Sprintf("%s: %v", stage, cause)
	fmt.Fprintf(lb, "\n==> %s\n", msg)
	if err := s.store.MarkApplicationFailed(appID, msg); err != nil {
		log.Printf("deploy: mark failed %s: %v", appID, err)
	}
}

func (s *Server) stopApp(w http.ResponseWriter, app store.Application) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := s.docker.Stop(ctx, app.ContainerName); err != nil && !docker.IsNotFound(err) {
		writeStatus(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	a, err := s.store.SetApplicationStatus(app.ID, store.StatusStopped)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) restartApp(w http.ResponseWriter, app store.Application) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := s.docker.Restart(ctx, app.ContainerName); err != nil {
		if docker.IsNotFound(err) {
			writeStatus(w, http.StatusConflict, map[string]string{"error": "Container bulunamadı, önce deploy edin"})
			return
		}
		writeStatus(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	a, err := s.store.SetApplicationStatus(app.ID, store.StatusRunning)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) handleApplicationLogs(w http.ResponseWriter, r *http.Request) {
	app, err := s.store.GetApplication(chi.URLParam(r, "aid"))
	if err != nil {
		writeError(w, err)
		return
	}

	out := ""
	if s.docker != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		logs, lerr := s.docker.Logs(ctx, app.ContainerName, 300)
		cancel()
		if lerr == nil {
			out = logs
		}
	}
	if strings.TrimSpace(out) == "" {
		if lb := s.getBuildLog(app.ID); lb != nil {
			out = lb.String()
		}
	}
	writeJSON(w, map[string]string{"logs": out})
}

func (s *Server) handleApplicationStats(w http.ResponseWriter, r *http.Request) {
	app, err := s.store.GetApplication(chi.URLParam(r, "aid"))
	if err != nil {
		writeError(w, err)
		return
	}
	if s.docker == nil {
		writeStatus(w, http.StatusServiceUnavailable, map[string]string{"error": "Docker daemon erişilemiyor"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	stat, err := s.docker.Stats(ctx, app.ContainerName)
	if err != nil {
		if docker.IsNotFound(err) {
			writeJSON(w, docker.Stat{})
			return
		}
		writeStatus(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, stat)
}

func derefPort(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

// buildGitURL composes the remote build context URL Docker understands,
// injecting the auth token and branch fragment when present.
func buildGitURL(repo, branch, token string) string {
	repo = strings.TrimRight(strings.TrimSpace(repo), "/")
	if !strings.HasPrefix(repo, "http://") && !strings.HasPrefix(repo, "https://") {
		repo = "https://" + repo
	}
	// Docker's remote builder only recognizes an http(s) context as a git
	// repository when the path ends in ".git"; otherwise it fetches the page.
	if !strings.HasSuffix(repo, ".git") {
		repo += ".git"
	}
	if token != "" {
		if i := strings.Index(repo, "://"); i != -1 {
			repo = repo[:i+3] + token + "@" + repo[i+3:]
		}
	}
	if branch = strings.TrimSpace(branch); branch != "" {
		repo += "#" + branch
	}
	return repo
}
