package templates

import "testing"

func TestResolveDefaults(t *testing.T) {
	// Only the required password is supplied; everything else should fall back to
	// the catalog defaults.
	got, err := Resolve("postgres", map[string]string{"password": "pw"})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if got.Image != "postgres:17-alpine" {
		t.Errorf("image = %q, want postgres:17-alpine", got.Image)
	}
	if got.ContainerPort == nil || *got.ContainerPort != 5432 {
		t.Errorf("containerPort = %v, want 5432", got.ContainerPort)
	}
	if got.HostPort == nil || *got.HostPort != 5432 {
		t.Errorf("hostPort = %v, want 5432", got.HostPort)
	}
	if !hasEnv(got.Env, "POSTGRES_USER", "app") {
		t.Errorf("env missing POSTGRES_USER=app: %+v", got.Env)
	}
}

func TestResolveOverrides(t *testing.T) {
	got, err := Resolve("postgres", map[string]string{
		"version":  "16",
		"user":     "svc",
		"password": "s3cr3t",
		"hostPort": "6543",
	})
	if err != nil {
		t.Fatalf("Resolve: %v", err)
	}
	if got.Image != "postgres:16-alpine" {
		t.Errorf("image = %q, want postgres:16-alpine", got.Image)
	}
	if got.HostPort == nil || *got.HostPort != 6543 {
		t.Errorf("hostPort = %v, want 6543", got.HostPort)
	}
	if !hasEnv(got.Env, "POSTGRES_USER", "svc") {
		t.Errorf("env missing POSTGRES_USER=svc: %+v", got.Env)
	}
}

func TestResolveErrors(t *testing.T) {
	tests := []struct {
		name   string
		id     string
		values map[string]string
	}{
		{"unknown template", "mysql", nil},
		{"invalid select option", "postgres", map[string]string{"version": "99", "password": "x"}},
		{"invalid host port", "postgres", map[string]string{"password": "x", "hostPort": "99999"}},
		{"missing required", "postgres", map[string]string{"password": ""}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := Resolve(tt.id, tt.values); err == nil {
				t.Errorf("Resolve(%q, %v) = nil error, want error", tt.id, tt.values)
			}
		})
	}
}

func hasEnv(env []EnvVar, key, value string) bool {
	for _, e := range env {
		if e.Key == key {
			return e.Value == value
		}
	}
	return false
}
