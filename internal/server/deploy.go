package server

import (
	"bytes"
	"context"
	"fmt"
	"io"
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
		RestartPolicy: app.RestartPolicy,
		Labels:        labels,
	})
	if err != nil {
		s.failDeploy(app.ID, lb, "Container başlatılamadı", err)
		return
	}

	// Write the final log line before flipping status so a log stream that
	// stops on the status change still captures it.
	fmt.Fprintf(lb, "==> Dağıtım tamamlandı\n")
	if _, err := s.store.MarkApplicationDeployed(app.ID, image, cid); err != nil {
		log.Printf("deploy: mark deployed %s: %v", app.ID, err)
	}
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

// handleApplicationLogStream streams build output live over SSE while the
// application is building, then sends a "done" event. After the build finishes
// the client falls back to polling container logs.
func (s *Server) handleApplicationLogStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	aid := chi.URLParam(r, "aid")
	if _, err := s.store.GetApplication(aid); err != nil {
		writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ctx := r.Context()
	offset := 0

	// emit sends any new build-log bytes and reports whether the build is over.
	emit := func() (status string, done bool) {
		if lb := s.getBuildLog(aid); lb != nil {
			full := lb.String()
			if len(full) > offset {
				writeSSEData(w, full[offset:])
				offset = len(full)
			}
		}
		app, err := s.store.GetApplication(aid)
		if err != nil {
			return "", true
		}
		return app.Status, app.Status != store.StatusBuilding
	}

	finish := func(status string) {
		writeSSEEvent(w, "done", status)
		flusher.Flush()
	}

	if status, done := emit(); done {
		finish(status)
		return
	}
	flusher.Flush()

	ticker := time.NewTicker(400 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			status, done := emit()
			flusher.Flush()
			if done {
				finish(status)
				return
			}
		}
	}
}

// writeSSEData emits data as a single SSE message, preserving embedded newlines
// by splitting them across data: fields (the client rejoins them with "\n").
func writeSSEData(w io.Writer, data string) {
	for _, line := range strings.Split(data, "\n") {
		fmt.Fprintf(w, "data: %s\n", line)
	}
	fmt.Fprint(w, "\n")
}

func writeSSEEvent(w io.Writer, event, data string) {
	fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
}

// removeEnvContainers removes the Docker container of every application in env.
func (s *Server) removeEnvContainers(ctx context.Context, env store.Environment) {
	apps, err := s.store.ListApplications(env.ID)
	if err != nil {
		return
	}
	for _, a := range apps {
		_ = s.docker.Remove(ctx, store.ContainerName(env.ProjectName, env.Name, a.Name))
	}
}

// removeProjectContainers removes the containers of every application across all
// environments of a project.
func (s *Server) removeProjectContainers(ctx context.Context, pid string) {
	envs, err := s.store.ListEnvironments(pid)
	if err != nil {
		return
	}
	for _, e := range envs {
		s.removeEnvContainers(ctx, e)
	}
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
