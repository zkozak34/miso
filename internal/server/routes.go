package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/metrics"
	"github.com/zeynelkozak/miso/internal/sse"
	"github.com/zeynelkozak/miso/internal/store"
)

func (s *Server) routes() http.Handler {
	r := s.router

	r.Route("/api", func(api chi.Router) {
		api.Get("/system/info", s.handleSystemInfo)
		api.Get("/metrics", s.handleMetrics)
		api.Handle("/metrics/stream", sse.NewHandler(2*time.Second))

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
			r.Delete("/", s.handleDeleteApplication)
			r.Get("/logs", s.handleApplicationLogs)
			r.Get("/logs/stream", s.handleApplicationLogStream)
			r.Get("/stats", s.handleApplicationStats)
			r.Post("/{action}", s.handleApplicationAction)
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, info)
}

func (s *Server) handleMetrics(w http.ResponseWriter, r *http.Request) {
	snap, err := metrics.NewCollector().Collect(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, snap)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func writeStatus(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, err error) {
	code := http.StatusInternalServerError
	if errors.Is(err, store.ErrNotFound) {
		code = http.StatusNotFound
	}
	writeStatus(w, code, map[string]string{"error": err.Error()})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON body"})
		return false
	}
	return true
}
