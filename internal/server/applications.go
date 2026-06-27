package server

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/store"
	"github.com/zeynelkozak/miso/internal/templates"
)

func (s *Server) handleListTemplates(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, templates.Catalog())
}

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

// createApplicationRequest is the wire shape for creating an application. It
// extends the store input with the raw template answers, which the server
// resolves into a concrete image, ports and env vars before persisting.
type createApplicationRequest struct {
	store.ApplicationInput
	TemplateValues map[string]string `json:"templateValues"`
}

func (s *Server) handleCreateApplication(w http.ResponseWriter, r *http.Request) {
	var req createApplicationRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	in := req.ApplicationInput
	if strings.TrimSpace(in.Name) == "" {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	in.Name = strings.TrimSpace(in.Name)

	// A template source is configured by answers, not raw image/env: resolve it
	// here so the catalog stays the single source of truth for image and ports.
	if in.SourceType == "template" {
		res, err := templates.Resolve(in.TemplateID, req.TemplateValues)
		if err != nil {
			writeStatus(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		in.Image = res.Image
		in.HostPort = res.HostPort
		in.ContainerPort = res.ContainerPort
		in.EnvVars = toStoreEnv(res.Env)
	}

	a, err := s.store.CreateApplication(chi.URLParam(r, "eid"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeStatus(w, http.StatusCreated, a)
}

// toStoreEnv converts resolved template env vars into the store's type.
func toStoreEnv(in []templates.EnvVar) []store.EnvVar {
	out := make([]store.EnvVar, 0, len(in))
	for _, v := range in {
		out = append(out, store.EnvVar{Key: v.Key, Value: v.Value, Secret: v.Secret})
	}
	return out
}

func (s *Server) handleGetApplication(w http.ResponseWriter, r *http.Request) {
	a, err := s.store.GetApplication(chi.URLParam(r, "aid"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) handleUpdateApplication(w http.ResponseWriter, r *http.Request) {
	var in store.ApplicationSettings
	if !decodeJSON(w, r, &in) {
		return
	}
	if in.RestartPolicy != "" && !store.ValidRestartPolicy(in.RestartPolicy) {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "geçersiz restart policy"})
		return
	}
	a, err := s.store.UpdateApplicationSettings(chi.URLParam(r, "aid"), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) handleUpdateApplicationEnv(w http.ResponseWriter, r *http.Request) {
	var in struct {
		EnvVars []store.EnvVar `json:"envVars"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	a, err := s.store.UpdateApplicationEnv(chi.URLParam(r, "aid"), in.EnvVars)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) handleUpdateApplicationAuthToken(w http.ResponseWriter, r *http.Request) {
	var in struct {
		AuthToken string `json:"authToken"`
	}
	if !decodeJSON(w, r, &in) {
		return
	}
	a, err := s.store.UpdateApplicationAuthToken(chi.URLParam(r, "aid"), strings.TrimSpace(in.AuthToken))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, a)
}

func (s *Server) handleDeleteApplication(w http.ResponseWriter, r *http.Request) {
	aid := chi.URLParam(r, "aid")
	if s.docker != nil {
		if app, err := s.store.GetApplication(aid); err == nil && app.ContainerID != "" {
			ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
			_ = s.docker.Remove(ctx, app.ContainerID)
			cancel()
		}
	}
	if err := s.store.DeleteApplication(aid); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
