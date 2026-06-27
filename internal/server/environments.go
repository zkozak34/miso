package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/store"
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
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	e, err := s.store.CreateEnvironment(chi.URLParam(r, "pid"), strings.TrimSpace(in.Name))
	if err != nil {
		writeError(w, err)
		return
	}
	writeStatus(w, http.StatusCreated, e)
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
			if apps, err := s.store.ListApplications(eid); err == nil {
				ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
				for _, a := range apps {
					_ = s.docker.Remove(ctx, store.ContainerName(env.ProjectName, env.Name, a.Name))
				}
				cancel()
			}
		}
	}
	if err := s.store.DeleteEnvironment(eid); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
