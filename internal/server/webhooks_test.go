package server

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func TestValidGitHubSignature(t *testing.T) {
	secret := "topsecret"
	body := []byte(`{"ref":"refs/heads/main"}`)
	good := sign(secret, body)

	tests := []struct {
		name   string
		secret string
		header string
		body   []byte
		want   bool
	}{
		{"valid", secret, good, body, true},
		{"wrong secret", "other", good, body, false},
		{"tampered body", secret, good, []byte(`{"ref":"refs/heads/dev"}`), false},
		{"empty secret", "", good, body, false},
		{"missing prefix", secret, hex.EncodeToString([]byte("x")), body, false},
		{"empty header", secret, "", body, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validGitHubSignature(tt.secret, tt.header, tt.body); got != tt.want {
				t.Errorf("validGitHubSignature(%q, %q, ...) = %v, want %v", tt.secret, tt.header, got, tt.want)
			}
		})
	}
}
