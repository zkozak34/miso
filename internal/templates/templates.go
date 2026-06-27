// Package templates is a declarative catalog of one-click application
// templates (PostgreSQL, Redis, …). A template is a prebuilt Docker Hub image
// plus a small set of user-facing fields that map onto the image's version
// tag, published port and environment variables. Adding a new template means
// appending a Template literal to catalog — no new code paths.
package templates

import (
	"fmt"
	"slices"
	"strconv"
	"strings"
)

// FieldType controls how a field is rendered and validated on the client.
type FieldType string

const (
	FieldText     FieldType = "text"     // free text input
	FieldPassword FieldType = "password" // masked text input
	FieldSelect   FieldType = "select"   // pick one of Options
	FieldPort     FieldType = "port"     // numeric host port
)

// Field roles let a value drive something other than an env var. A field may
// also (or instead) carry an EnvKey to be injected as an environment variable.
type FieldRole string

const (
	RoleNone     FieldRole = ""         // value only feeds EnvKey (if set)
	RoleVersion  FieldRole = "version"  // value substitutes {version} in Image
	RoleHostPort FieldRole = "hostPort" // value becomes the published host port
)

// Field is one user input in a template's form.
type Field struct {
	Key      string    `json:"key"`                // form/value identifier
	Label    string    `json:"label"`              // shown to the user
	Type     FieldType `json:"type"`               // input kind
	Role     FieldRole `json:"role,omitempty"`     // special meaning, if any
	EnvKey   string    `json:"envKey,omitempty"`   // env var to set from this value
	Secret   bool      `json:"secret,omitempty"`   // mask the resulting env var
	Default  string    `json:"default,omitempty"`  // value used when left blank
	Options  []string  `json:"options,omitempty"`  // choices for FieldSelect
	Required bool      `json:"required,omitempty"` // reject empty value
	Help     string    `json:"help,omitempty"`     // optional hint text
}

// Template describes a deployable image and the form used to configure it.
type Template struct {
	ID            string   `json:"id"`            // stable identifier ("postgres")
	Name          string   `json:"name"`          // display name ("PostgreSQL")
	Description   string   `json:"description"`   // one-line summary
	Icon          string   `json:"icon"`          // glyph for the picker card
	Color         string   `json:"color"`         // accent color for the icon
	Image         string   `json:"image"`         // image with a {version} placeholder
	ContainerPort int      `json:"containerPort"` // port the service listens on
	Volumes       []string `json:"volumes"`       // data paths worth persisting (informational)
	Fields        []Field  `json:"fields"`        // configuration inputs
}

// Resolved is the concrete deploy configuration produced from a template and
// the user's answers, ready to be stored as an application.
type Resolved struct {
	Image         string
	HostPort      *int
	ContainerPort *int
	Env           []EnvVar
}

// EnvVar mirrors store.EnvVar without importing it, keeping this package free
// of dependencies on the persistence layer. The server converts as needed.
type EnvVar struct {
	Key    string
	Value  string
	Secret bool
}

// catalog is the in-memory list of available templates. Append here to add one.
var catalog = []Template{
	{
		ID:            "postgres",
		Name:          "PostgreSQL",
		Description:   "Relational database",
		Icon:          "◆",
		Color:         "#60a5fa",
		Image:         "postgres:{version}-alpine",
		ContainerPort: 5432,
		Volumes:       []string{"/var/lib/postgresql/data"},
		Fields: []Field{
			{Key: "version", Label: "Version", Type: FieldSelect, Role: RoleVersion,
				Default: "17", Options: []string{"18", "17", "16", "15"}},
			{Key: "user", Label: "User", Type: FieldText, EnvKey: "POSTGRES_USER", Default: "app"},
			{Key: "database", Label: "Database", Type: FieldText, EnvKey: "POSTGRES_DB", Default: "app"},
			{Key: "password", Label: "Password", Type: FieldPassword, EnvKey: "POSTGRES_PASSWORD",
				Secret: true, Required: true, Help: "Set a strong password"},
			{Key: "hostPort", Label: "Host port", Type: FieldPort, Role: RoleHostPort, Default: "5432"},
		},
	},
}

// Catalog returns all available templates.
func Catalog() []Template { return catalog }

// Get returns the template with the given id.
func Get(id string) (Template, bool) {
	for _, t := range catalog {
		if t.ID == id {
			return t, true
		}
	}
	return Template{}, false
}

// Resolve turns a template id plus the user's field values into a concrete
// deploy configuration. Empty values fall back to each field's default;
// required fields must be non-empty; select fields must match an option.
func Resolve(id string, values map[string]string) (Resolved, error) {
	t, ok := Get(id)
	if !ok {
		return Resolved{}, fmt.Errorf("bilinmeyen şablon: %q", id)
	}

	image := t.Image
	containerPort := t.ContainerPort
	out := Resolved{ContainerPort: &containerPort}

	for _, f := range t.Fields {
		v := strings.TrimSpace(values[f.Key])
		if v == "" {
			v = f.Default
		}
		if f.Required && v == "" {
			return Resolved{}, fmt.Errorf("%q alanı zorunlu", f.Label)
		}
		if f.Type == FieldSelect && v != "" && !slices.Contains(f.Options, v) {
			return Resolved{}, fmt.Errorf("%q için geçersiz değer: %q", f.Label, v)
		}

		switch f.Role {
		case RoleVersion:
			image = strings.ReplaceAll(image, "{version}", v)
		case RoleHostPort:
			if v != "" {
				port, err := strconv.Atoi(v)
				if err != nil || port < 1 || port > 65535 {
					return Resolved{}, fmt.Errorf("%q geçerli bir port değil", f.Label)
				}
				out.HostPort = &port
			}
		}

		if f.EnvKey != "" {
			out.Env = append(out.Env, EnvVar{Key: f.EnvKey, Value: v, Secret: f.Secret})
		}
	}

	// Guard against a template whose {version} was never substituted.
	image = strings.ReplaceAll(image, "{version}", "latest")
	out.Image = image
	return out, nil
}
