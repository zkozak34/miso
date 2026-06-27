CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS environments (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
    id              TEXT PRIMARY KEY,
    environment_id  TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    source_type     TEXT NOT NULL DEFAULT 'git',
    repo_url        TEXT NOT NULL DEFAULT '',
    branch          TEXT NOT NULL DEFAULT 'main',
    dockerfile_path TEXT NOT NULL DEFAULT 'Dockerfile',
    build_args      TEXT NOT NULL DEFAULT '{}',
    auth_token      TEXT NOT NULL DEFAULT '',
    image           TEXT NOT NULL DEFAULT '',
    host_port       INTEGER,
    container_port  INTEGER,
    container_id    TEXT NOT NULL DEFAULT '',
    last_error      TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'stopped',
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_environment ON applications(environment_id);
