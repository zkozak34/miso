package server

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/zeynelkozak/miso/internal/store"
)

// maxWebhookBody caps the payload we read from a webhook delivery. GitHub's own
// limit is 25 MB; we must read the whole body to verify its HMAC signature.
const maxWebhookBody = 25 << 20

// handleGitHubWebhook receives a GitHub webhook delivery addressed to a single
// application (identified by the id in the URL), verifies its HMAC signature
// against that app's secret, and deploys the app on a push to its branch.
func (s *Server) handleGitHubWebhook(w http.ResponseWriter, r *http.Request) {
	app, secret, err := s.store.GetApplicationByWebhookID(chi.URLParam(r, "webhookId"))
	if err != nil {
		writeStatus(w, http.StatusNotFound, map[string]string{"error": "webhook bulunamadı"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, maxWebhookBody))
	if err != nil {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "gövde okunamadı"})
		return
	}
	if !validGitHubSignature(secret, r.Header.Get("X-Hub-Signature-256"), body) {
		writeStatus(w, http.StatusUnauthorized, map[string]string{"error": "imza doğrulanamadı"})
		return
	}

	switch r.Header.Get("X-GitHub-Event") {
	case "ping":
		writeJSON(w, map[string]any{"ok": true, "message": "pong"})
	case "push":
		s.handlePushEvent(w, app, body)
	default:
		writeJSON(w, map[string]any{"ignored": true})
	}
}

// handlePushEvent deploys app when the push targets its configured branch.
// Pushes to other branches and branch deletions are acknowledged but ignored.
func (s *Server) handlePushEvent(w http.ResponseWriter, app store.Application, body []byte) {
	var p struct {
		Ref     string `json:"ref"`
		Deleted bool   `json:"deleted"`
	}
	if err := json.Unmarshal(body, &p); err != nil {
		writeStatus(w, http.StatusBadRequest, map[string]string{"error": "geçersiz payload"})
		return
	}
	branch := strings.TrimPrefix(p.Ref, "refs/heads/")
	if p.Deleted || branch != app.Branch {
		writeJSON(w, map[string]any{"ignored": true, "branch": branch})
		return
	}
	if s.docker == nil {
		writeStatus(w, http.StatusServiceUnavailable, map[string]string{"error": "Docker daemon erişilemiyor"})
		return
	}
	if _, err := s.startDeploy(app, "push · "+branch); err != nil {
		// A push arriving mid-build is benign: acknowledge it without a 5xx so
		// GitHub doesn't flag the delivery as failed.
		if errors.Is(err, errDeployInProgress) {
			writeJSON(w, map[string]any{"ignored": true, "reason": "deploy in progress"})
			return
		}
		writeStatus(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, map[string]any{"ok": true, "deploying": app.Name, "branch": branch})
}

// validGitHubSignature reports whether header is a valid GitHub
// X-Hub-Signature-256 value ("sha256=<hex>") for body under secret, compared
// in constant time.
func validGitHubSignature(secret, header string, body []byte) bool {
	const prefix = "sha256="
	if secret == "" || !strings.HasPrefix(header, prefix) {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(strings.TrimPrefix(header, prefix)))
}

// handleGetWebhook returns the webhook URL and secret to configure on the app's
// GitHub repository. The URL host is derived from the incoming request.
func (s *Server) handleGetWebhook(w http.ResponseWriter, r *http.Request) {
	s.writeWebhookConfig(w, r, false)
}

// handleRegenerateWebhook rotates the secret then returns the fresh config.
func (s *Server) handleRegenerateWebhook(w http.ResponseWriter, r *http.Request) {
	s.writeWebhookConfig(w, r, true)
}

func (s *Server) writeWebhookConfig(w http.ResponseWriter, r *http.Request, regenerate bool) {
	aid := chi.URLParam(r, "aid")
	app, err := s.store.GetApplication(aid)
	if err != nil {
		writeError(w, err)
		return
	}
	whID, secret, err := s.store.ApplicationWebhook(aid)
	if err != nil {
		writeError(w, err)
		return
	}
	if regenerate {
		if secret, err = s.store.RegenerateWebhookSecret(aid); err != nil {
			writeError(w, err)
			return
		}
	}
	writeJSON(w, map[string]any{
		"url":    webhookURL(r, whID),
		"secret": secret,
		"branch": app.Branch,
	})
}

// webhookURL builds the absolute URL GitHub should POST deliveries to, using the
// scheme and host of the request that loaded the settings page.
func webhookURL(r *http.Request, webhookID string) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if p := r.Header.Get("X-Forwarded-Proto"); p != "" {
		scheme = p
	}
	return fmt.Sprintf("%s://%s/api/webhooks/github/%s", scheme, r.Host, webhookID)
}
