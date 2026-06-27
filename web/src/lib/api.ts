// Shared types mirroring the Go API payloads, plus formatting helpers.

export interface CPUStats {
  usedPercent: number
  perCore: number[]
  cores: number
}

export interface MemoryStats {
  total: number
  used: number
  usedPercent: number
  swapTotal: number
  swapUsed: number
}

export interface DiskStats {
  mountpoint: string
  fstype: string
  total: number
  used: number
  usedPercent: number
}

export interface NetStats {
  bytesSent: number
  bytesRecv: number
  sentPerSec: number
  recvPerSec: number
}

export interface Snapshot {
  timestamp: number
  cpu: CPUStats
  memory: MemoryStats
  disks: DiskStats[]
  network: NetStats
}

export interface SystemInfo {
  hostname: string
  os: string
  platform: string
  platformVersion: string
  kernelVersion: string
  kernelArch: string
  uptime: number
  bootTime: number
  procs: number
  cpuModel: string
  cpuCores: number
  totalMemory: number
  goVersion: string
}

export async function fetchSystemInfo(signal?: AbortSignal): Promise<SystemInfo> {
  const res = await fetch("/api/system/info", { signal })
  if (!res.ok) throw new Error(`system info: ${res.status}`)
  return res.json()
}

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"]

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes < 0) return "0 B"
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${UNITS[i]}`
}

export function formatBitsPerSec(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d) parts.push(`${d}g`)
  if (h) parts.push(`${h}s`)
  if (m || parts.length === 0) parts.push(`${m}dk`)
  return parts.join(" ")
}
