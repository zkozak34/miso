package store

import (
	"crypto/rand"
	"database/sql"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schema string

var ErrNotFound = errors.New("not found")

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("apply schema: %w", err)
	}
	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return &Store{db: db}, nil
}

// migrate adds columns introduced after the initial schema so databases
// created by earlier versions keep working.
func migrate(db *sql.DB) error {
	cols := map[string]bool{}
	rows, err := db.Query(`PRAGMA table_info(applications)`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			rows.Close()
			return err
		}
		cols[name] = true
	}
	rows.Close()

	add := []struct{ name, ddl string }{
		{"container_id", `ALTER TABLE applications ADD COLUMN container_id TEXT NOT NULL DEFAULT ''`},
		{"last_error", `ALTER TABLE applications ADD COLUMN last_error TEXT NOT NULL DEFAULT ''`},
		{"restart_policy", `ALTER TABLE applications ADD COLUMN restart_policy TEXT NOT NULL DEFAULT 'unless-stopped'`},
	}
	for _, a := range add {
		if cols[a.name] {
			continue
		}
		if _, err := db.Exec(a.ddl); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) Close() error { return s.db.Close() }

func newID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func now() int64 { return time.Now().UnixMilli() }

func (s *Store) ListProjects() ([]Project, error) {
	const q = `
		SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
		  (SELECT COUNT(*) FROM environments e WHERE e.project_id = p.id),
		  (SELECT COUNT(*) FROM applications a JOIN environments e ON a.environment_id = e.id WHERE e.project_id = p.id),
		  COALESCE((SELECT MAX(` + rankCase + `) FROM applications a JOIN environments e ON a.environment_id = e.id WHERE e.project_id = p.id), 0)
		FROM projects p ORDER BY p.created_at DESC`
	rows, err := s.db.Query(q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Project{}
	for rows.Next() {
		var p Project
		var rank int
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.CreatedAt, &p.UpdatedAt, &p.EnvironmentCount, &p.AppCount, &rank); err != nil {
			return nil, err
		}
		p.Status = statusFromRank(rank)
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) GetProject(id string) (Project, error) {
	const q = `
		SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
		  (SELECT COUNT(*) FROM environments e WHERE e.project_id = p.id),
		  (SELECT COUNT(*) FROM applications a JOIN environments e ON a.environment_id = e.id WHERE e.project_id = p.id),
		  COALESCE((SELECT MAX(` + rankCase + `) FROM applications a JOIN environments e ON a.environment_id = e.id WHERE e.project_id = p.id), 0)
		FROM projects p WHERE p.id = ?`
	var p Project
	var rank int
	err := s.db.QueryRow(q, id).Scan(&p.ID, &p.Name, &p.Description, &p.CreatedAt, &p.UpdatedAt, &p.EnvironmentCount, &p.AppCount, &rank)
	if errors.Is(err, sql.ErrNoRows) {
		return Project{}, ErrNotFound
	}
	if err != nil {
		return Project{}, err
	}
	p.Status = statusFromRank(rank)
	return p, nil
}

func (s *Store) CreateProject(name, description string) (Project, error) {
	p := Project{ID: newID(), Name: name, Description: description, Status: StatusStopped, CreatedAt: now(), UpdatedAt: now()}
	_, err := s.db.Exec(`INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		p.ID, p.Name, p.Description, p.CreatedAt, p.UpdatedAt)
	return p, err
}

func (s *Store) UpdateProject(id, name, description string) (Project, error) {
	res, err := s.db.Exec(`UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?`, name, description, now(), id)
	if err != nil {
		return Project{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Project{}, ErrNotFound
	}
	return s.GetProject(id)
}

func (s *Store) DeleteProject(id string) error { return s.deleteByID("projects", id) }

func (s *Store) ListEnvironments(projectID string) ([]Environment, error) {
	const q = `
		SELECT e.id, e.project_id, p.name, e.name, e.created_at, e.updated_at,
		  (SELECT COUNT(*) FROM applications a WHERE a.environment_id = e.id),
		  COALESCE((SELECT MAX(` + rankCase + `) FROM applications a WHERE a.environment_id = e.id), 0)
		FROM environments e JOIN projects p ON e.project_id = p.id
		WHERE e.project_id = ? ORDER BY e.created_at DESC`
	rows, err := s.db.Query(q, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Environment{}
	for rows.Next() {
		var e Environment
		var rank int
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.ProjectName, &e.Name, &e.CreatedAt, &e.UpdatedAt, &e.AppCount, &rank); err != nil {
			return nil, err
		}
		e.Status = statusFromRank(rank)
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Store) GetEnvironment(id string) (Environment, error) {
	const q = `
		SELECT e.id, e.project_id, p.name, e.name, e.created_at, e.updated_at,
		  (SELECT COUNT(*) FROM applications a WHERE a.environment_id = e.id),
		  COALESCE((SELECT MAX(` + rankCase + `) FROM applications a WHERE a.environment_id = e.id), 0)
		FROM environments e JOIN projects p ON e.project_id = p.id WHERE e.id = ?`
	var e Environment
	var rank int
	err := s.db.QueryRow(q, id).Scan(&e.ID, &e.ProjectID, &e.ProjectName, &e.Name, &e.CreatedAt, &e.UpdatedAt, &e.AppCount, &rank)
	if errors.Is(err, sql.ErrNoRows) {
		return Environment{}, ErrNotFound
	}
	if err != nil {
		return Environment{}, err
	}
	e.Status = statusFromRank(rank)
	return e, nil
}

func (s *Store) CreateEnvironment(projectID, name string) (Environment, error) {
	if _, err := s.GetProject(projectID); err != nil {
		return Environment{}, err
	}
	id := newID()
	ts := now()
	if _, err := s.db.Exec(`INSERT INTO environments (id, project_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
		id, projectID, name, ts, ts); err != nil {
		return Environment{}, err
	}
	return s.GetEnvironment(id)
}

func (s *Store) DeleteEnvironment(id string) error { return s.deleteByID("environments", id) }

func (s *Store) ListApplications(envID string) ([]Application, error) {
	const q = `
		SELECT id, environment_id, name, source_type, repo_url, branch, dockerfile_path,
		  build_args, (auth_token != ''), image, host_port, container_port, container_id, last_error, restart_policy, status, created_at, updated_at
		FROM applications WHERE environment_id = ? ORDER BY created_at ASC`
	rows, err := s.db.Query(q, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Application{}
	for rows.Next() {
		a, err := scanApplication(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) GetApplication(id string) (Application, error) {
	const q = `
		SELECT a.id, a.environment_id, a.name, a.source_type, a.repo_url, a.branch, a.dockerfile_path,
		  a.build_args, (a.auth_token != ''), a.image, a.host_port, a.container_port, a.container_id, a.last_error, a.restart_policy, a.status, a.created_at, a.updated_at,
		  e.project_id, p.name, e.name
		FROM applications a
		JOIN environments e ON a.environment_id = e.id
		JOIN projects p ON e.project_id = p.id
		WHERE a.id = ?`
	row := s.db.QueryRow(q, id)
	var a Application
	var buildArgs string
	var hasToken bool
	if err := row.Scan(&a.ID, &a.EnvironmentID, &a.Name, &a.SourceType, &a.RepoURL, &a.Branch, &a.DockerfilePath,
		&buildArgs, &hasToken, &a.Image, &a.HostPort, &a.ContainerPort, &a.ContainerID, &a.LastError, &a.RestartPolicy, &a.Status, &a.CreatedAt, &a.UpdatedAt,
		&a.ProjectID, &a.ProjectName, &a.EnvironmentNm); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Application{}, ErrNotFound
		}
		return Application{}, err
	}
	a.BuildArgs = decodeBuildArgs(buildArgs)
	a.HasAuthToken = hasToken
	a.ContainerName = ContainerName(a.ProjectName, a.EnvironmentNm, a.Name)
	return a, nil
}

func (s *Store) CreateApplication(envID string, in ApplicationInput) (Application, error) {
	if _, err := s.GetEnvironment(envID); err != nil {
		return Application{}, err
	}
	id := newID()
	ts := now()
	source := in.SourceType
	if source == "" {
		source = "git"
	}
	branch := in.Branch
	if branch == "" {
		branch = "main"
	}
	dockerfile := in.DockerfilePath
	if dockerfile == "" {
		dockerfile = "Dockerfile"
	}
	args, _ := json.Marshal(normalizeArgs(in.BuildArgs))
	if _, err := s.db.Exec(`
		INSERT INTO applications (id, environment_id, name, source_type, repo_url, branch, dockerfile_path,
		  build_args, auth_token, image, host_port, container_port, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, envID, in.Name, source, in.RepoURL, branch, dockerfile, string(args), in.AuthToken, in.Image,
		in.HostPort, in.ContainerPort, StatusStopped, ts, ts); err != nil {
		return Application{}, err
	}
	return s.GetApplication(id)
}

// UpdateApplicationSettings persists the runtime settings editable from the
// detail page (ports, restart policy). They apply on the next deploy.
func (s *Store) UpdateApplicationSettings(id string, in ApplicationSettings) (Application, error) {
	policy := in.RestartPolicy
	if !ValidRestartPolicy(policy) {
		policy = "unless-stopped"
	}
	res, err := s.db.Exec(
		`UPDATE applications SET host_port = ?, container_port = ?, restart_policy = ?, updated_at = ? WHERE id = ?`,
		in.HostPort, in.ContainerPort, policy, now(), id)
	if err != nil {
		return Application{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Application{}, ErrNotFound
	}
	return s.GetApplication(id)
}

// ApplicationAuthToken returns the raw (unmasked) auth token for build use.
func (s *Store) ApplicationAuthToken(id string) (string, error) {
	var token string
	err := s.db.QueryRow(`SELECT auth_token FROM applications WHERE id = ?`, id).Scan(&token)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	return token, err
}

// MarkApplicationDeployed records a successful deploy: running status, built
// image, container id and a cleared error.
func (s *Store) MarkApplicationDeployed(id, image, containerID string) (Application, error) {
	res, err := s.db.Exec(
		`UPDATE applications SET status = ?, image = ?, container_id = ?, last_error = '', updated_at = ? WHERE id = ?`,
		StatusRunning, image, containerID, now(), id)
	if err != nil {
		return Application{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Application{}, ErrNotFound
	}
	return s.GetApplication(id)
}

// MarkApplicationFailed records a failed build/deploy with the error message.
func (s *Store) MarkApplicationFailed(id, lastError string) error {
	_, err := s.db.Exec(
		`UPDATE applications SET status = ?, last_error = ?, updated_at = ? WHERE id = ?`,
		StatusFailed, lastError, now(), id)
	return err
}

func (s *Store) SetApplicationStatus(id, status string) (Application, error) {
	res, err := s.db.Exec(`UPDATE applications SET status = ?, last_error = '', updated_at = ? WHERE id = ?`, status, now(), id)
	if err != nil {
		return Application{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Application{}, ErrNotFound
	}
	return s.GetApplication(id)
}

func (s *Store) DeleteApplication(id string) error { return s.deleteByID("applications", id) }

func (s *Store) deleteByID(table, id string) error {
	res, err := s.db.Exec(`DELETE FROM `+table+` WHERE id = ?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func scanApplication(rows *sql.Rows) (Application, error) {
	var a Application
	var buildArgs string
	var hasToken bool
	if err := rows.Scan(&a.ID, &a.EnvironmentID, &a.Name, &a.SourceType, &a.RepoURL, &a.Branch, &a.DockerfilePath,
		&buildArgs, &hasToken, &a.Image, &a.HostPort, &a.ContainerPort, &a.ContainerID, &a.LastError, &a.RestartPolicy, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return Application{}, err
	}
	a.BuildArgs = decodeBuildArgs(buildArgs)
	a.HasAuthToken = hasToken
	return a, nil
}

func decodeBuildArgs(s string) map[string]string {
	m := map[string]string{}
	if s == "" {
		return m
	}
	_ = json.Unmarshal([]byte(s), &m)
	return m
}

func normalizeArgs(in map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range in {
		if strings.TrimSpace(k) != "" {
			out[k] = v
		}
	}
	return out
}

var nonDockerName = regexp.MustCompile(`[^a-z0-9]+`)

// dockerSlug lowercases a segment and replaces any run of characters that are
// invalid in a Docker name with a single dash, trimming leading/trailing dashes.
func dockerSlug(s string) string {
	s = nonDockerName.ReplaceAllString(strings.ToLower(strings.TrimSpace(s)), "-")
	return strings.Trim(s, "-")
}

// ContainerName builds the Docker container name as projectName-env-appName,
// sanitized to the Docker name grammar ([a-z0-9][a-z0-9_.-]*).
func ContainerName(project, env, app string) string {
	parts := make([]string, 0, 3)
	for _, p := range []string{project, env, app} {
		if v := dockerSlug(p); v != "" {
			parts = append(parts, v)
		}
	}
	name := strings.Join(parts, "-")
	if name == "" {
		name = "app"
	}
	return name
}

// ImageName derives the local image tag for a container name.
func ImageName(containerName string) string {
	return "miso/" + containerName + ":latest"
}
