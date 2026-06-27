import type { ResourceStatus } from "@/lib/api/resources"
import { cn } from "@/lib/utils"

const CONFIG: Record<
  ResourceStatus,
  { label: string; dot: string; text: string; pulse?: boolean }
> = {
  running: { label: "Running", dot: "bg-emerald-500", text: "text-emerald-500", pulse: true },
  building: { label: "Building", dot: "bg-amber-500", text: "text-amber-500", pulse: true },
  failed: { label: "Failed", dot: "bg-red-500", text: "text-red-500" },
  stopped: { label: "Stopped", dot: "bg-muted-foreground", text: "text-muted-foreground" },
}

export function StatusBadge({ status, className }: { status: ResourceStatus; className?: string }) {
  const c = CONFIG[status] ?? CONFIG.stopped
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", c.text, className)}>
      <span className={cn("h-2 w-2 rounded-full", c.dot, c.pulse && "animate-pulse")} />
      {c.label}
    </span>
  )
}
