package docker

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	cerrdefs "github.com/containerd/errdefs"
	"github.com/docker/docker/api/types/build"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

// Client wraps the Docker Engine SDK with the small surface Miso needs:
// build an image from a git repo, run/stop/restart a single container, and
// read its state, logs and live stats.
type Client struct {
	cli *client.Client
}

// New connects to the local Docker daemon using the environment configuration
// and negotiates the API version. It returns an error if the daemon is
// unreachable so callers can degrade gracefully.
func New(ctx context.Context) (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}
	if _, err := cli.Ping(ctx); err != nil {
		_ = cli.Close()
		return nil, err
	}
	return &Client{cli: cli}, nil
}

func (c *Client) Close() error { return c.cli.Close() }

// BuildSpec describes an image build from a remote git context. GitURL must
// already carry any branch fragment and embedded auth token.
type BuildSpec struct {
	Image      string
	GitURL     string
	Dockerfile string
	BuildArgs  map[string]string
	Labels     map[string]string
}

// Build builds spec.Image from the remote git context, streaming the daemon
// output to logw. It returns an error if the build reports one.
func (c *Client) Build(ctx context.Context, spec BuildSpec, logw io.Writer) error {
	args := make(map[string]*string, len(spec.BuildArgs))
	for k, v := range spec.BuildArgs {
		val := v
		args[k] = &val
	}

	resp, err := c.cli.ImageBuild(ctx, nil, build.ImageBuildOptions{
		Tags:          []string{spec.Image},
		RemoteContext: spec.GitURL,
		Dockerfile:    spec.Dockerfile,
		BuildArgs:     args,
		Labels:        spec.Labels,
		Remove:        true,
		ForceRemove:   true,
		PullParent:    true,
		Version:       build.BuilderV1,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return streamBuild(resp.Body, logw)
}

// streamBuild decodes the daemon's JSON build stream, forwarding human output
// to logw and surfacing the first reported error.
func streamBuild(body io.Reader, logw io.Writer) error {
	dec := json.NewDecoder(body)
	for {
		var msg struct {
			Stream      string `json:"stream"`
			Status      string `json:"status"`
			Error       string `json:"error"`
			ErrorDetail struct {
				Message string `json:"message"`
			} `json:"errorDetail"`
		}
		if err := dec.Decode(&msg); err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
		if msg.Error != "" {
			if logw != nil {
				fmt.Fprintln(logw, msg.Error)
			}
			if msg.ErrorDetail.Message != "" {
				return fmt.Errorf("%s", msg.ErrorDetail.Message)
			}
			return fmt.Errorf("%s", msg.Error)
		}
		if logw != nil {
			if msg.Stream != "" {
				io.WriteString(logw, msg.Stream)
			} else if msg.Status != "" {
				fmt.Fprintln(logw, msg.Status)
			}
		}
	}
}

// RunSpec describes a container to create and start.
type RunSpec struct {
	Image         string
	Name          string
	HostPort      int
	ContainerPort int
	RestartPolicy string
	Env           []string
	Labels        map[string]string
}

// Run removes any existing Miso-managed container with the same name, then
// creates and starts a fresh one. It returns the new container ID. If a
// container with that name exists but Miso does not manage it, Run refuses
// rather than clobbering an unrelated container.
func (c *Client) Run(ctx context.Context, spec RunSpec) (string, error) {
	if info, err := c.cli.ContainerInspect(ctx, spec.Name); err == nil {
		if info.Config == nil || info.Config.Labels["miso.managed"] != "true" {
			return "", fmt.Errorf("%q adında, miso tarafından yönetilmeyen bir container zaten var", spec.Name)
		}
		_ = c.Remove(ctx, spec.Name)
	} else if !cerrdefs.IsNotFound(err) {
		return "", err
	}

	cfg := &container.Config{
		Image:  spec.Image,
		Env:    spec.Env,
		Labels: spec.Labels,
	}
	policy := container.RestartPolicyMode(spec.RestartPolicy)
	if policy == "" {
		policy = container.RestartPolicyUnlessStopped
	}
	host := &container.HostConfig{
		RestartPolicy: container.RestartPolicy{Name: policy},
	}

	if spec.ContainerPort > 0 {
		port, err := nat.NewPort("tcp", strconv.Itoa(spec.ContainerPort))
		if err != nil {
			return "", err
		}
		cfg.ExposedPorts = nat.PortSet{port: struct{}{}}
		hostPort := ""
		if spec.HostPort > 0 {
			hostPort = strconv.Itoa(spec.HostPort)
		}
		host.PortBindings = nat.PortMap{port: []nat.PortBinding{{HostIP: "0.0.0.0", HostPort: hostPort}}}
	}

	created, err := c.cli.ContainerCreate(ctx, cfg, host, nil, nil, spec.Name)
	if err != nil {
		return "", err
	}
	if err := c.cli.ContainerStart(ctx, created.ID, container.StartOptions{}); err != nil {
		return created.ID, err
	}
	return created.ID, nil
}

func (c *Client) Stop(ctx context.Context, name string) error {
	timeout := 10
	return c.cli.ContainerStop(ctx, name, container.StopOptions{Timeout: &timeout})
}

func (c *Client) Restart(ctx context.Context, name string) error {
	timeout := 10
	return c.cli.ContainerRestart(ctx, name, container.StopOptions{Timeout: &timeout})
}

func (c *Client) Remove(ctx context.Context, name string) error {
	return c.cli.ContainerRemove(ctx, name, container.RemoveOptions{Force: true})
}

// State is the runtime state of a container as seen by the daemon.
type State struct {
	Exists   bool
	Running  bool
	Status   string
	ExitCode int
	Error    string
}

// Inspect returns the container's state. A missing container yields a
// zero-value State with Exists=false and no error.
func (c *Client) Inspect(ctx context.Context, name string) (State, error) {
	info, err := c.cli.ContainerInspect(ctx, name)
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return State{}, nil
		}
		return State{}, err
	}
	st := State{Exists: true}
	if info.State != nil {
		st.Running = info.State.Running
		st.Status = string(info.State.Status)
		st.ExitCode = info.State.ExitCode
		st.Error = info.State.Error
	}
	return st, nil
}

// Logs returns the last tail lines of the container's combined stdout/stderr.
func (c *Client) Logs(ctx context.Context, name string, tail int) (string, error) {
	rc, err := c.cli.ContainerLogs(ctx, name, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Timestamps: true,
		Tail:       strconv.Itoa(tail),
	})
	if err != nil {
		if cerrdefs.IsNotFound(err) {
			return "", nil
		}
		return "", err
	}
	defer rc.Close()
	var b strings.Builder
	if err := demuxLogs(rc, &b); err != nil {
		return b.String(), err
	}
	return b.String(), nil
}

// demuxLogs strips the 8-byte multiplexing header Docker prepends to each log
// frame when the container has no TTY.
func demuxLogs(r io.Reader, w io.Writer) error {
	header := make([]byte, 8)
	for {
		if _, err := io.ReadFull(r, header); err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				return nil
			}
			return err
		}
		size := int64(header[4])<<24 | int64(header[5])<<16 | int64(header[6])<<8 | int64(header[7])
		if _, err := io.CopyN(w, r, size); err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
	}
}

// Stat is a single sampled resource snapshot for a container.
type Stat struct {
	CPUPercent  float64 `json:"cpuPercent"`
	MemoryUsage uint64  `json:"memoryUsage"`
	MemoryLimit uint64  `json:"memoryLimit"`
	NetRxBytes  uint64  `json:"netRxBytes"`
	NetTxBytes  uint64  `json:"netTxBytes"`
}

// Stats reads a single resource snapshot. The daemon includes the previous CPU
// sample so the percentage is meaningful even for a one-shot read.
func (c *Client) Stats(ctx context.Context, name string) (Stat, error) {
	resp, err := c.cli.ContainerStats(ctx, name, false)
	if err != nil {
		return Stat{}, err
	}
	defer resp.Body.Close()

	var raw container.StatsResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return Stat{}, err
	}

	var s Stat
	cpuDelta := float64(raw.CPUStats.CPUUsage.TotalUsage) - float64(raw.PreCPUStats.CPUUsage.TotalUsage)
	sysDelta := float64(raw.CPUStats.SystemUsage) - float64(raw.PreCPUStats.SystemUsage)
	if sysDelta > 0 && cpuDelta > 0 {
		cpus := float64(raw.CPUStats.OnlineCPUs)
		if cpus == 0 {
			cpus = float64(len(raw.CPUStats.CPUUsage.PercpuUsage))
		}
		if cpus == 0 {
			cpus = 1
		}
		s.CPUPercent = (cpuDelta / sysDelta) * cpus * 100
	}

	s.MemoryUsage = raw.MemoryStats.Usage
	if cache, ok := raw.MemoryStats.Stats["inactive_file"]; ok && s.MemoryUsage > cache {
		s.MemoryUsage -= cache
	}
	s.MemoryLimit = raw.MemoryStats.Limit

	for _, n := range raw.Networks {
		s.NetRxBytes += n.RxBytes
		s.NetTxBytes += n.TxBytes
	}
	return s, nil
}

// IsNotFound reports whether err is a Docker "no such container/image" error.
func IsNotFound(err error) bool { return cerrdefs.IsNotFound(err) }

// Available reports whether the daemon is currently reachable.
func (c *Client) Available(ctx context.Context) bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_, err := c.cli.Ping(ctx)
	return err == nil
}
