package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type environmentInput struct {
	Name string `json:"name"`
}

func (s *Server) handleListEnvironments(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "pid")
	if _, err := s.store.GetProject(pid); err != nil {
		writeError(w, err)
		return
	}
	envs, err := s.store.ListEnvironments(pid)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, envs)
}

func (s *Server) handleCreateEnvironment(w http.ResponseWriter, r *http.Request) {
	var in environmentInput
	if !decodeJSON(w, r, &in) {
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		writeErrorMsg(w, http.StatusBadRequest, "name is required")
		return
	}
	e, err := s.store.CreateEnvironment(chi.URLParam(r, "pid"), strings.TrimSpace(in.Name))
	if err != nil {
		writeError(w, err)
		return
	}
	writeCreated(w, e)
}

func (s *Server) handleGetEnvironment(w http.ResponseWriter, r *http.Request) {
	e, err := s.store.GetEnvironment(chi.URLParam(r, "eid"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, e)
}

func (s *Server) handleDeleteEnvironment(w http.ResponseWriter, r *http.Request) {
	eid := chi.URLParam(r, "eid")
	if s.docker != nil {
		if env, err := s.store.GetEnvironment(eid); err == nil {
			ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
			s.removeEnvContainers(ctx, env)
			cancel()
		}
	}
	if err := s.store.DeleteEnvironment(eid); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, nil)
}
