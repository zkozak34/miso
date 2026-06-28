import { Play } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Application } from "@/lib/api/resources"
import { useApplicationAction, useDeployments } from "@/lib/queries"
import { fmtDuration, fmtStarted, triggerLabel } from "./deployment-format"

export function DeploymentsTab({ app }: { app: Application }) {
  const { data: deployments, isLoading } = useDeployments(app.id, app.status === "building")
  const action = useApplicationAction(app.id)

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />
  }

  const rows = deployments ?? []
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
        <div>
          <p className="text-sm font-semibold">Henüz dağıtım yok</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bu uygulamayı dağıtınca derleme ve sürüm geçmişi burada görünür.
          </p>
        </div>
        <Button
          disabled={action.isPending}
          onClick={() =>
            action.mutate("deploy", {
              onSuccess: () => toast.success("Dağıtım başlatıldı"),
              onError: (e) => toast.error(e.message),
            })
          }
        >
          <Play className="h-4 w-4" /> Şimdi dağıt
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="w-28 flex-none">Durum</span>
        <span className="flex-1">İmaj</span>
        <span className="w-28 flex-none">Tetikleyici</span>
        <span className="w-32 flex-none">Başladı</span>
        <span className="w-16 flex-none text-right">Süre</span>
      </div>
      {rows.map((d) => (
        <div
          key={d.id}
          className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/20"
        >
          <span className="w-28 flex-none">
            <StatusBadge status={d.status} />
          </span>
          <span
            className="flex-1 truncate font-mono text-xs text-foreground"
            title={d.error || d.image}
          >
            {d.image || "—"}
          </span>
          <span className="w-28 flex-none text-xs text-muted-foreground">
            {triggerLabel(d.trigger)}
          </span>
          <span className="w-32 flex-none font-mono text-xs text-muted-foreground">
            {fmtStarted(d.startedAt)}
          </span>
          <span className="w-16 flex-none text-right font-mono text-xs text-muted-foreground">
            {fmtDuration(d)}
          </span>
        </div>
      ))}
    </div>
  )
}
