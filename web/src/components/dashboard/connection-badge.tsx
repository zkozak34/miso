import { Badge } from "@/components/ui/badge"
import type { useMetricsStream } from "@/hooks/use-metrics-stream"
import { cn } from "@/lib/utils"

type ConnectionStatus = ReturnType<typeof useMetricsStream>["status"]

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const map = {
    open: { label: "Canlı", dot: "bg-emerald-500" },
    connecting: { label: "Bağlanıyor", dot: "bg-amber-500" },
    closed: { label: "Kesildi", dot: "bg-red-500" },
  } as const
  const { label, dot } = map[status]
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot, status === "open" && "animate-pulse")} />
      {label}
    </Badge>
  )
}
