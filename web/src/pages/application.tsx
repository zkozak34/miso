import {
  AlertTriangle,
  Cpu,
  MemoryStick,
  Network,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsageAreaChart } from "@/components/dashboard/usage-area-chart"
import { StatusBadge } from "@/components/status-badge"
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatBytes } from "@/lib/api"
import type { Application, RestartPolicy } from "@/lib/api/resources"
import {
  useApplication,
  useApplicationAction,
  useApplicationLogs,
  useApplicationStats,
  useDeleteApplication,
  useUpdateApplication,
} from "@/lib/queries"

export function ApplicationPage() {
  const { projectId = "", envId = "", appId = "" } = useParams()
  const navigate = useNavigate()
  const { data: app, isLoading, isError } = useApplication(appId)

  useEffect(() => {
    if (isError) navigate(`/projects/${projectId}/environments/${envId}`, { replace: true })
  }, [isError, navigate, projectId, envId])

  if (isLoading || !app) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects">Projeler</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectId}`} className="font-mono">
                {app.projectName}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectId}/environments/${envId}`} className="font-mono">
                {app.environmentName}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{app.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Header app={app} />

      {app.status === "failed" && app.lastError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="font-medium text-destructive">Son dağıtım başarısız oldu</p>
            <p className="mt-0.5 break-words font-mono text-xs text-muted-foreground">
              {app.lastError}
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Overview app={app} />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <Logs app={app} />
        </TabsContent>
        <TabsContent value="environment" className="mt-6">
          <Placeholder title="Ortam değişkenleri" />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <Settings app={app} />
        </TabsContent>
        <TabsContent value="deployments" className="mt-6">
          <Placeholder title="Dağıtım geçmişi" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Header({ app }: { app: Application }) {
  const navigate = useNavigate()
  const action = useApplicationAction(app.id)
  const del = useDeleteApplication(app.environmentId)
  const [confirmOpen, setConfirmOpen] = useState(false)
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
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={del.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Sil
        </Button>
      </div>

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

// useStatsHistory polls live container stats and keeps a rolling window for the
// charts. The window resets whenever the container stops running.
function useStatsHistory(appId: string, running: boolean) {
  const { data } = useApplicationStats(appId, running)
  const [history, setHistory] = useState<{ cpu: number; mem: number }[]>([])

  useEffect(() => {
    if (!running) setHistory([])
  }, [running])

  useEffect(() => {
    if (!data || !running) return
    setHistory((h) => [...h.slice(-39), { cpu: data.cpuPercent, mem: data.memoryUsage }])
  }, [data, running])

  return { latest: data, history }
}

const MB = 1024 * 1024

function Overview({ app }: { app: Application }) {
  const running = app.status === "running"
  const { latest, history } = useStatsHistory(app.id, running)

  const cpuData = useMemo(() => history.map((p) => ({ cpu: Number(p.cpu.toFixed(1)) })), [history])
  const memData = useMemo(() => history.map((p) => ({ memory: Math.round(p.mem / MB) })), [history])

  const cpu = latest?.cpuPercent ?? 0
  const memUsageMB = latest ? latest.memoryUsage / MB : 0
  const memLimitMB = latest?.memoryLimit ? latest.memoryLimit / MB : 0
  const ports =
    app.hostPort && app.containerPort
      ? `${app.hostPort}:${app.containerPort}`
      : app.containerPort
        ? `:${app.containerPort}`
        : "—"

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {!running && (
          <p className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
            Canlı metrikler yalnızca container çalışırken görüntülenir.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="CPU"
            icon={Cpu}
            accent="var(--chart-1)"
            value={`${cpu.toFixed(1)}%`}
            percent={cpu}
          />
          <StatCard
            title="Bellek"
            icon={MemoryStick}
            accent="var(--chart-2)"
            value={`${Math.round(memUsageMB)} MB`}
            subtitle={memLimitMB ? `/ ${Math.round(memLimitMB)} MB` : undefined}
            percent={memLimitMB ? (memUsageMB / memLimitMB) * 100 : 0}
          />
          <StatCard
            title="Ağ"
            icon={Network}
            accent="var(--chart-3)"
            value={formatBytes(latest?.netRxBytes ?? 0)}
            subtitle="↓ toplam"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CPU</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageAreaChart
              data={cpuData}
              yMax={100}
              height={160}
              format={(v) => `${v.toFixed(0)}%`}
              series={[{ key: "cpu", color: "var(--chart-1)", label: "CPU" }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bellek</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageAreaChart
              data={memData}
              height={160}
              format={(v) => `${Math.round(v)} MB`}
              series={[{ key: "memory", color: "var(--chart-2)", label: "Bellek" }]}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Detaylar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col">
          <DetailRow label="Durum" value={<StatusBadge status={app.status} />} />
          <DetailRow
            label="Kaynak"
            value={<span className="font-mono">{app.repoUrl || app.image || "—"}</span>}
          />
          <DetailRow label="Branch" value={<span className="font-mono">{app.branch}</span>} />
          <DetailRow
            label="Container"
            value={<span className="font-mono">{app.containerName}</span>}
          />
          <DetailRow label="Portlar" value={<span className="font-mono">{ports}</span>} />
        </CardContent>
      </Card>
    </div>
  )
}

function Logs({ app }: { app: Application }) {
  const building = app.status === "building"
  const [liveLog, setLiveLog] = useState("")

  // While building, stream the daemon's build output live over SSE.
  useEffect(() => {
    if (!building) return
    setLiveLog("")
    const es = new EventSource(`/api/applications/${app.id}/logs/stream`)
    es.onmessage = (e) => setLiveLog((prev) => prev + e.data)
    es.addEventListener("done", () => es.close())
    es.onerror = () => es.close()
    return () => es.close()
  }, [building, app.id])

  // Once running/stopped, fall back to polling container logs.
  const { data, isLoading } = useApplicationLogs(app.id, app.status === "running")
  const content = building ? liveLog : (data?.logs?.trimEnd() ?? "")
  const placeholder = building || isLoading ? "Yükleniyor…" : "Henüz log yok. Uygulamayı dağıtın."

  return (
    <Card>
      <CardContent className="p-0">
        <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed">
          {content || placeholder}
        </pre>
      </CardContent>
    </Card>
  )
}

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

function Settings({ app }: { app: Application }) {
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
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-medium">{value}</span>
    </div>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">Docker fazında gelecek.</p>
    </div>
  )
}
