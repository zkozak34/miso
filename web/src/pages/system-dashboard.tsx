import { Dashboard } from "@/components/dashboard/dashboard"
import { SettingsDialog } from "@/components/settings-dialog"
import { Badge } from "@/components/ui/badge"
import { useMetricsStream } from "@/hooks/use-metrics-stream"
import { cn } from "@/lib/utils"

function ConnectionBadge({ status }: { status: ReturnType<typeof useMetricsStream>["status"] }) {
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

export function SystemDashboardPage() {
  const { latest, history, status } = useMetricsStream()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sistem Dashboard</h1>
          <p className="text-sm text-muted-foreground">Canlı kaynak kullanımı ve sistem bilgisi.</p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionBadge status={status} />
          <SettingsDialog />
        </div>
      </div>
      <Dashboard latest={latest} history={history} />
    </div>
  )
}
