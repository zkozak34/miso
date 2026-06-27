package metrics

import (
	"context"
	"runtime"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

// SystemInfo describes static-ish host information shown in the info panel.
type SystemInfo struct {
	Hostname        string `json:"hostname"`
	OS              string `json:"os"`
	Platform        string `json:"platform"`
	PlatformVersion string `json:"platformVersion"`
	KernelVersion   string `json:"kernelVersion"`
	KernelArch      string `json:"kernelArch"`
	Uptime          uint64 `json:"uptime"` // seconds
	BootTime        uint64 `json:"bootTime"`
	Procs           uint64 `json:"procs"`
	CPUModel        string `json:"cpuModel"`
	CPUCores        int    `json:"cpuCores"`
	TotalMemory     uint64 `json:"totalMemory"`
	GoVersion       string `json:"goVersion"`
}

// GetSystemInfo collects host metadata.
func GetSystemInfo(ctx context.Context) (SystemInfo, error) {
	info := SystemInfo{
		KernelArch: runtime.GOARCH,
		GoVersion:  runtime.Version(),
	}

	if h, err := host.InfoWithContext(ctx); err == nil {
		info.Hostname = h.Hostname
		info.OS = h.OS
		info.Platform = h.Platform
		info.PlatformVersion = h.PlatformVersion
		info.KernelVersion = h.KernelVersion
		if h.KernelArch != "" {
			info.KernelArch = h.KernelArch
		}
		info.Uptime = h.Uptime
		info.BootTime = h.BootTime
		info.Procs = h.Procs
	}

	if cpus, err := cpu.InfoWithContext(ctx); err == nil && len(cpus) > 0 {
		info.CPUModel = cpus[0].ModelName
	}
	if n, err := cpu.CountsWithContext(ctx, true); err == nil {
		info.CPUCores = n
	}
	if vm, err := mem.VirtualMemoryWithContext(ctx); err == nil {
		info.TotalMemory = vm.Total
	}

	return info, nil
}
