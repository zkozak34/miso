package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type projectInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := s.store.ListProjects()
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, projects)
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var in projectInput
	if !decodeJSON(w, r, &in) {
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	p, err := s.store.CreateProject(strings.TrimSpace(in.Name), strings.TrimSpace(in.Description))
	if err != nil {
		writeError(w, err)
		return
	}
	writeStatus(w, http.StatusCreated, p)
}

func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	p, err := s.store.GetProject(chi.URLParam(r, "pid"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, p)
}

func (s *Server) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	var in projectInput
	if !decodeJSON(w, r, &in) {
		return
	}
	p, err := s.store.UpdateProject(chi.URLParam(r, "pid"), strings.TrimSpace(in.Name), strings.TrimSpace(in.Description))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, p)
}

func (s *Server) handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "pid")
	if s.docker != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
		s.removeProjectContainers(ctx, pid)
		cancel()
	}
	if err := s.store.DeleteProject(pid); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
