package server

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/store"
)

func (s *Server) handleListApplications(w http.ResponseWriter, r *http.Request) {
	apps, err := s.store.ListApplications(chi.URLParam(r, "eid"))
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
	if err := s.store.DeleteApplication(chi.URLParam(r, "aid")); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleApplicationAction(w http.ResponseWriter, r *http.Request) {
	var status string
	switch chi.URLParam(r, "action") {
	case "deploy", "restart":
		status = store.StatusRunning
	case "stop":
		status = store.StatusStopped
	default:
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "unknown action"})
		return
	}
	a, err := s.store.SetApplicationStatus(chi.URLParam(r, "aid"), status)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}
