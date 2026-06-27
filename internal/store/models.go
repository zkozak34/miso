package store

const (
	StatusStopped  = "stopped"
	StatusRunning  = "running"
	StatusFailed   = "failed"
	StatusBuilding = "building"
)

func statusFromRank(rank int) string {
	switch rank {
	case 4:
		return StatusBuilding
	case 3:
		return StatusFailed
	case 2:
		return StatusRunning
	default:
		return StatusStopped
	}
}

const rankCase = `CASE a.status WHEN 'building' THEN 4 WHEN 'failed' THEN 3 WHEN 'running' THEN 2 WHEN 'stopped' THEN 1 ELSE 0 END`

type Project struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Description      string `json:"description"`
	EnvironmentCount int    `json:"environmentCount"`
	AppCount         int    `json:"appCount"`
	Status           string `json:"status"`
	CreatedAt        int64  `json:"createdAt"`
	UpdatedAt        int64  `json:"updatedAt"`
}

type Environment struct {
	ID          string `json:"id"`
	ProjectID   string `json:"projectId"`
	ProjectName string `json:"projectName"`
	Name        string `json:"name"`
	AppCount    int    `json:"appCount"`
	Status      string `json:"status"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
}

type Application struct {
	ID             string            `json:"id"`
	EnvironmentID  string            `json:"environmentId"`
	Name           string            `json:"name"`
	SourceType     string            `json:"sourceType"`
	TemplateID     string            `json:"templateId,omitempty"`
	RepoURL        string            `json:"repoUrl"`
	Branch         string            `json:"branch"`
	DockerfilePath string            `json:"dockerfilePath"`
	BuildArgs      map[string]string `json:"buildArgs"`
	HasAuthToken   bool              `json:"hasAuthToken"`
	Image          string            `json:"image"`
	HostPort       *int              `json:"hostPort"`
	ContainerPort  *int              `json:"containerPort"`
	ContainerID    string            `json:"containerId,omitempty"`
	LastError      string            `json:"lastError,omitempty"`
	RestartPolicy  string            `json:"restartPolicy"`
	EnvVars        []EnvVar          `json:"envVars"`
	Status         string            `json:"status"`
	ProjectID      string            `json:"projectId,omitempty"`
	ProjectName    string            `json:"projectName,omitempty"`
	EnvironmentNm  string            `json:"environmentName,omitempty"`
	ContainerName  string            `json:"containerName,omitempty"`
	CreatedAt      int64             `json:"createdAt"`
	UpdatedAt      int64             `json:"updatedAt"`
}

// EnvVar is a runtime environment variable injected into the container. Secret
// only controls UI masking; the value is stored and returned as-is.
type EnvVar struct {
	Key    string `json:"key"`
	Value  string `json:"value"`
	Secret bool   `json:"secret"`
}

type ApplicationInput struct {
	Name           string            `json:"name"`
	SourceType     string            `json:"sourceType"`
	TemplateID     string            `json:"templateId"`
	RepoURL        string            `json:"repoUrl"`
	Branch         string            `json:"branch"`
	DockerfilePath string            `json:"dockerfilePath"`
	BuildArgs      map[string]string `json:"buildArgs"`
	AuthToken      string            `json:"authToken"`
	Image          string            `json:"image"`
	HostPort       *int              `json:"hostPort"`
	ContainerPort  *int              `json:"containerPort"`
	EnvVars        []EnvVar          `json:"envVars"`
}

// ApplicationSettings holds the runtime fields editable from the detail page's
// Settings tab. They take effect on the next deploy.
type ApplicationSettings struct {
	HostPort      *int   `json:"hostPort"`
	ContainerPort *int   `json:"containerPort"`
	RestartPolicy string `json:"restartPolicy"`
}

// ValidRestartPolicy reports whether p is one of Docker's restart policy modes.
func ValidRestartPolicy(p string) bool {
	switch p {
	case "no", "on-failure", "unless-stopped", "always":
		return true
	}
	return false
}
