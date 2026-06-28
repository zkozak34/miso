import { Play, RotateCw, Square } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Application } from "@/lib/api/resources"
import { useApplicationAction } from "@/lib/queries"

export function ApplicationHeader({ app }: { app: Application }) {
  const action = useApplicationAction(app.id)
  const run = (a: "deploy" | "stop" | "restart", label: string) =>
    action.mutate(a, {
      onSuccess: () => toast.success(label),
      onError: (e) => toast.error(e.message),
    })

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{app.name}</h1>
          <Badge variant="secondary" className="font-normal">
            {app.sourceType}
          </Badge>
          <StatusBadge status={app.status} />
        </div>
        <p className="font-mono text-sm text-muted-foreground">{app.repoUrl || app.image || "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => run("stop", "Durduruldu")}
        >
          <Square className="h-4 w-4" /> Stop
        </Button>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => run("restart", "Yeniden başlatıldı")}
        >
          <RotateCw className="h-4 w-4" /> Restart
        </Button>
        <Button disabled={action.isPending} onClick={() => run("deploy", "Dağıtım başlatıldı")}>
          <Play className="h-4 w-4" /> Deploy
        </Button>
      </div>
    </div>
  )
}
