package server

import (
	"testing"

	"github.com/zeynelkozak/miso/internal/store"
)

func TestBuildGitURL(t *testing.T) {
	tests := []struct {
		name   string
		repo   string
		branch string
		token  string
		want   string
	}{
		{
			name: "bare host adds scheme and .git",
			repo: "github.com/acme/app",
			want: "https://github.com/acme/app.git",
		},
		{
			name:   "branch becomes fragment",
			repo:   "https://github.com/acme/app",
			branch: "develop",
			want:   "https://github.com/acme/app.git#develop",
		},
		{
			name:  "token is injected after scheme",
			repo:  "github.com/acme/app",
			token: "ghp_x",
			want:  "https://ghp_x@github.com/acme/app.git",
		},
		{
			name:   "token and branch together",
			repo:   "github.com/acme/app",
			branch: "main",
			token:  "tok",
			want:   "https://tok@github.com/acme/app.git#main",
		},
		{
			name: "existing .git suffix is kept",
			repo: "https://github.com/acme/app.git",
			want: "https://github.com/acme/app.git",
		},
		{
			name: "trailing slash is trimmed",
			repo: "https://github.com/acme/app/",
			want: "https://github.com/acme/app.git",
		},
		{
			name: "http scheme is preserved",
			repo: "http://git.local/acme/app",
			want: "http://git.local/acme/app.git",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildGitURL(tt.repo, tt.branch, tt.token); got != tt.want {
				t.Errorf("buildGitURL(%q, %q, %q) = %q, want %q", tt.repo, tt.branch, tt.token, got, tt.want)
			}
		})
	}
}

func TestIsImageSource(t *testing.T) {
	cases := map[string]bool{
		"docker":   true,
		"template": true,
		"git":      false,
		"":         false,
	}
	for src, want := range cases {
		if got := isImageSource(store.Application{SourceType: src}); got != want {
			t.Errorf("isImageSource(%q) = %v, want %v", src, got, want)
		}
	}
}
