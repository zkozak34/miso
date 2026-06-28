import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Application, RestartPolicy } from "@/lib/api/resources"
import { useDeleteApplication, useUpdateApplication } from "@/lib/queries"
import { AuthTokenCard } from "./auth-token-card"
import { DetailRow } from "./detail-row"
import { WebhookCard } from "./webhook-card"

const RESTART_POLICIES: { value: RestartPolicy; hint: string }[] = [
  { value: "no", hint: "Yeniden başlatma" },
  { value: "on-failure", hint: "Yalnızca hata ile çıkışta" },
  { value: "unless-stopped", hint: "Elle durdurulmadıkça" },
  { value: "always", hint: "Her zaman" },
]

const portError = (v: string) => {
  if (v.trim() === "") return false
  const n = Number(v)
  return !Number.isInteger(n) || n < 1 || n > 65535
}

export function SettingsTab({ app }: { app: Application }) {
  const navigate = useNavigate()
  const update = useUpdateApplication(app.id)
  const del = useDeleteApplication(app.environmentId)
  const [hostPort, setHostPort] = useState(app.hostPort?.toString() ?? "")
  const [containerPort, setContainerPort] = useState(app.containerPort?.toString() ?? "")
  const [restartPolicy, setRestartPolicy] = useState<RestartPolicy>(app.restartPolicy)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const parsedHost = hostPort.trim() === "" ? null : Number(hostPort)
  const parsedContainer = containerPort.trim() === "" ? null : Number(containerPort)
  const invalid = portError(hostPort) || portError(containerPort)
  const dirty =
    parsedHost !== app.hostPort ||
    parsedContainer !== app.containerPort ||
    restartPolicy !== app.restartPolicy

  const save = () => {
    update.mutate(
      { hostPort: parsedHost, containerPort: parsedContainer, restartPolicy },
      {
        onSuccess: () => toast.success("Ayarlar kaydedildi"),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-xs text-muted-foreground">
        Değişiklikler kaydedilir ve bir sonraki dağıtımda geçerli olur.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-baseline gap-2 text-base">
            Port eşlemesi
            <span className="text-xs font-normal text-muted-foreground">host → container</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Host</Label>
              <Input
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                placeholder="18080"
                inputMode="numeric"
                className={`w-28 font-mono ${portError(hostPort) ? "border-destructive" : ""}`}
              />
            </div>
            <span className="pb-2.5 font-mono text-muted-foreground">:</span>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Container</Label>
              <Input
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                placeholder="8080"
                inputMode="numeric"
                className={`w-28 font-mono ${portError(containerPort) ? "border-destructive" : ""}`}
              />
            </div>
            <Badge variant="secondary" className="mb-2 font-mono font-normal">
              tcp
            </Badge>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Container portu yayınlamak için her ikisini de doldurun. Boş bırakırsanız port
            yayınlanmaz.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restart policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {RESTART_POLICIES.map((p) => {
              const active = restartPolicy === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  title={p.hint}
                  onClick={() => setRestartPolicy(p.value)}
                  className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.value}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Container çıktığında Docker'ın onu yeniden başlatıp başlatmayacağını belirler.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {app.sourceType === "git" ? "Kaynak" : "İmaj"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          {app.sourceType === "git" ? (
            <>
              <DetailRow
                label="Repository"
                value={<span className="font-mono">{app.repoUrl || "—"}</span>}
              />
              <DetailRow label="Branch" value={<span className="font-mono">{app.branch}</span>} />
              <DetailRow
                label="Dockerfile"
                value={<span className="font-mono">{app.dockerfilePath}</span>}
              />
            </>
          ) : (
            <DetailRow label="İmaj" value={<span className="font-mono">{app.image || "—"}</span>} />
          )}
        </CardContent>
      </Card>

      <AuthTokenCard app={app} />
      <WebhookCard app={app} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume bağlamaları</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Volume bağlama henüz desteklenmiyor. Veriler geçicidir ve container silindiğinde
            kaybolur.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {dirty && (
          <Button
            variant="ghost"
            onClick={() => {
              setHostPort(app.hostPort?.toString() ?? "")
              setContainerPort(app.containerPort?.toString() ?? "")
              setRestartPolicy(app.restartPolicy)
            }}
          >
            Sıfırla
          </Button>
        )}
        <Button disabled={!dirty || invalid || update.isPending} onClick={save}>
          Kaydet
        </Button>
      </div>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-destructive">Uygulamayı kaldır</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Container ve yapılandırması durdurulup silinir. Bu işlem geri alınamaz.
            </p>
          </div>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:text-destructive"
            disabled={del.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Uygulamayı kaldır
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uygulamayı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{app.name}</span> ve çalışan container'ı kalıcı olarak
              silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                del.mutate(app.id, {
                  onSuccess: () => {
                    toast.success("Uygulama silindi")
                    navigate(`/projects/${app.projectId}/environments/${app.environmentId}`, {
                      replace: true,
                    })
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
