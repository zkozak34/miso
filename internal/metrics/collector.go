// Package metrics collects system resource usage via gopsutil.
package metrics

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
)

// Snapshot is a single point-in-time reading of system metrics.
type Snapshot struct {
	Timestamp int64       `json:"timestamp"` // unix milliseconds
	CPU       CPUStats    `json:"cpu"`
	Memory    MemoryStats `json:"memory"`
	Disks     []DiskStats `json:"disks"`
	Network   NetStats    `json:"network"`
}

type CPUStats struct {
	UsedPercent float64   `json:"usedPercent"`
	PerCore     []float64 `json:"perCore"`
	Cores       int       `json:"cores"`
}

type MemoryStats struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"usedPercent"`
	SwapTotal   uint64  `json:"swapTotal"`
	SwapUsed    uint64  `json:"swapUsed"`
}

type DiskStats struct {
	Mountpoint  string  `json:"mountpoint"`
	Fstype      string  `json:"fstype"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"usedPercent"`
}

type NetStats struct {
	BytesSent   uint64  `json:"bytesSent"`   // cumulative
	BytesRecv   uint64  `json:"bytesRecv"`   // cumulative
	SentPerSec  float64 `json:"sentPerSec"`  // bytes/sec since last sample
	RecvPerSec  float64 `json:"recvPerSec"`  // bytes/sec since last sample
}

// netSample holds the previous cumulative counters for rate computation.
type netSample struct {
	bytesSent uint64
	bytesRecv uint64
	at        time.Time
}

// Collector produces metric snapshots, computing rate-based fields (network
// throughput) from the delta between consecutive Collect calls. It is not safe
// for concurrent use; call it from a single goroutine (e.g. the SSE loop).
type Collector struct {
	prevNet *netSample
}

// NewCollector returns a Collector ready to produce snapshots.
func NewCollector() *Collector {
	return &Collector{}
}

// Collect gathers a fresh snapshot. CPU percentages are sampled non-blockingly
// against the kernel's cumulative counters, so the first call after process
// start reports cumulative-since-boot values; subsequent calls reflect the
// window since the previous call.
func (c *Collector) Collect(ctx context.Context) (Snapshot, error) {
	now := time.Now()
	s := Snapshot{Timestamp: now.UnixMilli()}

	// CPU: non-blocking (interval=0) returns usage since the previous call.
	if perCore, err := cpu.PercentWithContext(ctx, 0, true); err == nil {
		s.CPU.PerCore = perCore
		s.CPU.Cores = len(perCore)
	}
	if total, err := cpu.PercentWithContext(ctx, 0, false); err == nil && len(total) > 0 {
		s.CPU.UsedPercent = total[0]
	}

	if vm, err := mem.VirtualMemoryWithContext(ctx); err == nil {
		s.Memory.Total = vm.Total
		s.Memory.Used = vm.Used
		s.Memory.UsedPercent = vm.UsedPercent
	}
	if sw, err := mem.SwapMemoryWithContext(ctx); err == nil {
		s.Memory.SwapTotal = sw.Total
		s.Memory.SwapUsed = sw.Used
	}

	s.Disks = collectDisks(ctx)
	s.Network = c.collectNetwork(ctx, now)

	return s, nil
}

// pseudoFstypes are virtual/system filesystems we don't want cluttering the
// disk panel.
var pseudoFstypes = map[string]struct{}{
	"devfs": {}, "tmpfs": {}, "devtmpfs": {}, "overlay": {},
	"squashfs": {}, "proc": {}, "sysfs": {}, "autofs": {},
}

func collectDisks(ctx context.Context) []DiskStats {
	parts, err := disk.PartitionsWithContext(ctx, false)
	if err != nil {
		return nil
	}
	// Many systems (notably macOS APFS) expose one physical volume under several
	// synthesized mountpoints with identical usage. Dedupe by total+used so each
	// real volume shows once.
	seen := make(map[[2]uint64]struct{}, len(parts))
	out := make([]DiskStats, 0, len(parts))
	for _, p := range parts {
		if _, skip := pseudoFstypes[p.Fstype]; skip {
			continue
		}
		usage, err := disk.UsageWithContext(ctx, p.Mountpoint)
		if err != nil || usage.Total == 0 {
			continue
		}
		key := [2]uint64{usage.Total, usage.Used}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, DiskStats{
			Mountpoint:  usage.Path,
			Fstype:      p.Fstype,
			Total:       usage.Total,
			Used:        usage.Used,
			UsedPercent: usage.UsedPercent,
		})
	}
	return out
}

func (c *Collector) collectNetwork(ctx context.Context, now time.Time) NetStats {
	var ns NetStats
	counters, err := net.IOCountersWithContext(ctx, false) // false => aggregated across all interfaces
	if err != nil || len(counters) == 0 {
		return ns
	}
	agg := counters[0]
	ns.BytesSent = agg.BytesSent
	ns.BytesRecv = agg.BytesRecv

	if c.prevNet != nil {
		elapsed := now.Sub(c.prevNet.at).Seconds()
		if elapsed > 0 {
			ns.SentPerSec = float64(diff(agg.BytesSent, c.prevNet.bytesSent)) / elapsed
			ns.RecvPerSec = float64(diff(agg.BytesRecv, c.prevNet.bytesRecv)) / elapsed
		}
	}
	c.prevNet = &netSample{bytesSent: agg.BytesSent, bytesRecv: agg.BytesRecv, at: now}
	return ns
}

// diff guards against counter resets (e.g. interface restart) producing huge values.
func diff(cur, prev uint64) uint64 {
	if cur < prev {
		return 0
	}
	return cur - prev
}
