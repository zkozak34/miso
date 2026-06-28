import type { Deployment } from "@/lib/api/resources"

export function triggerLabel(trigger: string): string {
  return trigger === "manual" ? "Manuel" : trigger
}

export function fmtStarted(ms: number): string {
  if (!ms) return "—"
  return new Date(ms).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function fmtDuration(d: Deployment): string {
  if (d.status === "building" || d.durationMs <= 0) return "…"
  const total = Math.round(d.durationMs / 1000)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const r = total % 60
  return `${m}m ${r.toString().padStart(2, "0")}s`
}
