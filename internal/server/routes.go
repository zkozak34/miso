package server

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/metrics"
	"github.com/zeynelkozak/miso/internal/sse"
)

func (s *Server) routes() http.Handler {
	r := s.router

	r.Route("/api", func(api chi.Router) {
		api.Get("/system/info", s.handleSystemInfo)
		api.Get("/metrics", s.handleMetrics)
		api.Handle("/metrics/stream", sse.NewHandler(2*time.Second))
		api.Get("/templates", s.handleListTemplates)
		// GitHub posts deliveries here; secured per-app by HMAC signature.
		api.Post("/webhooks/github/{webhookId}", s.handleGitHubWebhook)

		api.Route("/projects", func(r chi.Router) {
			r.Get("/", s.handleListProjects)
			r.Post("/", s.handleCreateProject)
			r.Get("/{pid}", s.handleGetProject)
			r.Patch("/{pid}", s.handleUpdateProject)
			r.Delete("/{pid}", s.handleDeleteProject)
			r.Get("/{pid}/environments", s.handleListEnvironments)
			r.Post("/{pid}/environments", s.handleCreateEnvironment)
		})
		api.Route("/environments/{eid}", func(r chi.Router) {
			r.Get("/", s.handleGetEnvironment)
			r.Delete("/", s.handleDeleteEnvironment)
			r.Get("/applications", s.handleListApplications)
			r.Post("/applications", s.handleCreateApplication)
		})
		api.Route("/applications/{aid}", func(r chi.Router) {
			r.Get("/", s.handleGetApplication)
			r.Patch("/", s.handleUpdateApplication)
			r.Put("/env", s.handleUpdateApplicationEnv)
			r.Put("/auth-token", s.handleUpdateApplicationAuthToken)
			r.Delete("/", s.handleDeleteApplication)
			r.Get("/logs", s.handleApplicationLogs)
			r.Get("/logs/stream", s.handleApplicationLogStream)
			r.Get("/stats", s.handleApplicationStats)
			r.Get("/deployments", s.handleListDeployments)
			r.Get("/webhook", s.handleGetWebhook)
			r.Post("/webhook/regenerate", s.handleRegenerateWebhook)
			// Constrain the action param so it can't shadow the static routes above.
			r.Post("/{action:deploy|stop|restart}", s.handleApplicationAction)
		})
	})

	if spa, err := spaHandler(); err == nil {
		r.Handle("/*", spa)
	}

	return r
}

func (s *Server) handleSystemInfo(w http.ResponseWriter, r *http.Request) {
	info, err := metrics.GetSystemInfo(r.Context())
	if err != nil {
		writeErrorMsg(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, info)
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	snap, err := metrics.NewCollector().Collect(r.Context())
	if err != nil {
		writeErrorMsg(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, snap)
}
