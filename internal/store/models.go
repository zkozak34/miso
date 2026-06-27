package store

// Status values for applications (stored) and for aggregated project/environment status.
const (
	StatusStopped  = "stopped"
	StatusRunning  = "running"
	StatusFailed   = "failed"
	StatusBuilding = "building"
)

// statusFromRank maps the SQL aggregation rank back to a status string.
// Priority: building > failed > running > stopped.
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

// rankCase is the shared SQL expression mapping a status column to a numeric rank.
const rankCase = `CASE a.status WHEN 'building' THEN 4 WHEN 'failed' THEN 3 WHEN 'running' THEN 2 WHEN 'stopped' THEN 1 ELSE 0 END`

// Project groups environments. Counts and Status are aggregated, not stored.
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

// Environment splits a project (e.g. production, staging). Status is aggregated.
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

// Application is a single deployable unit (a Docker container, once Phase 3 lands).
type Application struct {
	ID             string            `json:"id"`
	EnvironmentID  string            `json:"environmentId"`
	Name           string            `json:"name"`
	SourceType     string            `json:"sourceType"`
	RepoURL        string            `json:"repoUrl"`
	Branch         string            `json:"branch"`
	DockerfilePath string            `json:"dockerfilePath"`
	BuildArgs      map[string]string `json:"buildArgs"`
	HasAuthToken   bool              `json:"hasAuthToken"`
	Image          string            `json:"image"`
	HostPort       *int              `json:"hostPort"`
	ContainerPort  *int              `json:"containerPort"`
	Status         string            `json:"status"`
	// Joined / computed fields (populated by GetApplication).
	ProjectID     string `json:"projectId,omitempty"`
	ProjectName   string `json:"projectName,omitempty"`
	EnvironmentNm string `json:"environmentName,omitempty"`
	ContainerName string `json:"containerName,omitempty"`
	CreatedAt     int64  `json:"createdAt"`
	UpdatedAt     int64  `json:"updatedAt"`
}

// ApplicationInput carries the create/update payload for an application.
type ApplicationInput struct {
	Name           string            `json:"name"`
	SourceType     string            `json:"sourceType"`
	RepoURL        string            `json:"repoUrl"`
	Branch         string            `json:"branch"`
	DockerfilePath string            `json:"dockerfilePath"`
	BuildArgs      map[string]string `json:"buildArgs"`
	AuthToken      string            `json:"authToken"`
	Image          string            `json:"image"`
}
