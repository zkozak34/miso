package server

import (
	"encoding/json"
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
	})

	// Embedded SPA (and client-side routing fallback) for everything else.
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
