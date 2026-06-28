import { ConnectionBadge } from "@/components/dashboard/connection-badge"
import { Dashboard } from "@/components/dashboard/dashboard"
import { SettingsDialog } from "@/components/settings-dialog"
import { useMetricsStream } from "@/hooks/use-metrics-stream"

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
