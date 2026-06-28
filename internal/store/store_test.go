package store

import (
	"path/filepath"
	"testing"
)

func TestContainerName(t *testing.T) {
	tests := []struct {
		project, env, app string
		want              string
	}{
		{"Acme", "Production", "Web API", "acme-production-web-api"},
		{"my_proj", "stg", "app", "my-proj-stg-app"},
		{"  ", "", "", "app"},
		{"Über", "Prod!!", "v2", "ber-prod-v2"},
	}
	for _, tt := range tests {
		if got := ContainerName(tt.project, tt.env, tt.app); got != tt.want {
			t.Errorf("ContainerName(%q,%q,%q) = %q, want %q", tt.project, tt.env, tt.app, got, tt.want)
		}
	}
}

func TestImageName(t *testing.T) {
	if got := ImageName("acme-prod-web"); got != "miso/acme-prod-web:latest" {
		t.Errorf("ImageName = %q", got)
	}
}

func TestValidRestartPolicy(t *testing.T) {
	for _, ok := range []string{"no", "on-failure", "unless-stopped", "always"} {
		if !ValidRestartPolicy(ok) {
			t.Errorf("ValidRestartPolicy(%q) = false, want true", ok)
		}
	}
	for _, bad := range []string{"", "sometimes", "Always"} {
		if ValidRestartPolicy(bad) {
			t.Errorf("ValidRestartPolicy(%q) = true, want false", bad)
		}
	}
}

func newTestStore(t *testing.T) *Store {
	t.Helper()
	st, err := Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { st.Close() })
	return st
}

func TestApplicationRoundTrip(t *testing.T) {
	st := newTestStore(t)

	proj, err := st.CreateProject("Acme", "desc")
	if err != nil {
		t.Fatalf("CreateProject: %v", err)
	}
	env, err := st.CreateEnvironment(proj.ID, "production")
	if err != nil {
		t.Fatalf("CreateEnvironment: %v", err)
	}

	app, err := st.CreateApplication(env.ID, ApplicationInput{
		Name:    "web",
		RepoURL: "github.com/acme/web",
		EnvVars: []EnvVar{
			{Key: "PORT", Value: "3000"},
			{Key: "  ", Value: "dropped"}, // blank key must be normalized away
		},
		BuildArgs: map[string]string{"NODE_ENV": "production"},
		AuthToken: "ghp_secret",
	})
	if err != nil {
		t.Fatalf("CreateApplication: %v", err)
	}

	got, err := st.GetApplication(app.ID)
	if err != nil {
		t.Fatalf("GetApplication: %v", err)
	}
	if got.Branch != "main" || got.DockerfilePath != "Dockerfile" || got.SourceType != "git" {
		t.Errorf("defaults not applied: %+v", got)
	}
	if len(got.EnvVars) != 1 || got.EnvVars[0].Key != "PORT" {
		t.Errorf("env vars not normalized: %+v", got.EnvVars)
	}
	if got.ContainerName != "acme-production-web" {
		t.Errorf("containerName = %q", got.ContainerName)
	}
	// The token must never be returned, only its presence.
	if !got.HasAuthToken {
		t.Error("HasAuthToken = false, want true")
	}

	token, err := st.ApplicationAuthToken(app.ID)
	if err != nil || token != "ghp_secret" {
		t.Errorf("ApplicationAuthToken = %q, %v", token, err)
	}
}

func TestStatusReconcileFields(t *testing.T) {
	st := newTestStore(t)
	proj, _ := st.CreateProject("p", "")
	env, _ := st.CreateEnvironment(proj.ID, "e")
	app, _ := st.CreateApplication(env.ID, ApplicationInput{Name: "a", RepoURL: "github.com/x/y"})

	if err := st.MarkApplicationFailed(app.ID, "boom"); err != nil {
		t.Fatal(err)
	}
	failed, _ := st.GetApplication(app.ID)
	if failed.Status != StatusFailed || failed.LastError != "boom" {
		t.Errorf("after fail: status=%q err=%q", failed.Status, failed.LastError)
	}

	// SetApplicationStatus clears the previous error.
	if _, err := st.SetApplicationStatus(app.ID, StatusRunning); err != nil {
		t.Fatalf("SetApplicationStatus: %v", err)
	}
	running, _ := st.GetApplication(app.ID)
	if running.Status != StatusRunning || running.LastError != "" {
		t.Errorf("after run: status=%q err=%q", running.Status, running.LastError)
	}
}

func TestGetApplicationNotFound(t *testing.T) {
	st := newTestStore(t)
	if _, err := st.GetApplication("nope"); err != ErrNotFound {
		t.Errorf("GetApplication(nope) err = %v, want ErrNotFound", err)
	}
}
