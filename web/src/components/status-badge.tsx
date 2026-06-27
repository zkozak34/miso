import type { ResourceStatus } from "@/lib/api/resources"
import { cn } from "@/lib/utils"

const CONFIG: Record<ResourceStatus, { label: string; color: string; pulse?: boolean }> = {
  running: { label: "Running", color: "var(--chart-2)", pulse: true },
  building: { label: "Building", color: "var(--chart-4)", pulse: true },
  failed: { label: "Failed", color: "var(--chart-5)" },
  stopped: { label: "Stopped", color: "var(--text-tertiary)" },
}

export function StatusBadge({ status, className }: { status: ResourceStatus; className?: string }) {
  const c = CONFIG[status] ?? CONFIG.stopped
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center gap-1.5 rounded-full border bg-surface-2 pl-2 pr-2.5",
        className,
      )}
    >
      <span className="relative flex h-[7px] w-[7px] flex-none">
        <span className="absolute inset-0 rounded-full" style={{ background: c.color }} />
        {c.pulse && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: c.color, animation: "ringPulse 2.4s ease-out infinite" }}
          />
        )}
      </span>
      <span className="text-[11px] font-medium" style={{ color: c.color }}>
        {c.label}
      </span>
    </span>
  )
}
