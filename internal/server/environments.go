package server

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
)

type environmentInput struct {
	Name string `json:"name"`
}

func (s *Server) handleListEnvironments(w http.ResponseWriter, r *http.Request) {
	envs, err := s.store.ListEnvironments(chi.URLParam(r, "pid"))
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
	if err := s.store.DeleteEnvironment(chi.URLParam(r, "eid")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
