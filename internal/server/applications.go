package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/store"
)

func (s *Server) handleListApplications(w http.ResponseWriter, r *http.Request) {
	eid := chi.URLParam(r, "eid")
	if _, err := s.store.GetEnvironment(eid); err != nil {
		writeError(w, err)
		return
	}
	apps, err := s.store.ListApplications(eid)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, apps)
}

func (s *Server) handleCreateApplication(w http.ResponseWriter, r *http.Request) {
	var in store.ApplicationInput
	if !decodeJSON(w, r, &in) {
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	a, err := s.store.CreateApplication(chi.URLParam(r, "eid"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeStatus(w, http.StatusCreated, a)
}

func (s *Server) handleGetApplication(w http.ResponseWriter, r *http.Request) {
	a, err := s.store.GetApplication(chi.URLParam(r, "aid"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) handleDeleteApplication(w http.ResponseWriter, r *http.Request) {
	aid := chi.URLParam(r, "aid")
	if s.docker != nil {
		if app, err := s.store.GetApplication(aid); err == nil {
			ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
			_ = s.docker.Remove(ctx, app.ContainerName)
			cancel()
		}
	}
	if err := s.store.DeleteApplication(aid); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
