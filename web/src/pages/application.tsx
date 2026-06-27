import {
  AlertTriangle,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  MemoryStick,
  Network,
  Play,
  Plus,
  RotateCw,
  Search,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { formatBytes } from "@/lib/api"
import type { Application, Deployment, EnvVar, RestartPolicy } from "@/lib/api/resources"
import {
  useApplication,
  useApplicationAction,
  useApplicationLogs,
  useApplicationStats,
  useDeleteApplication,
  useDeployments,
  useRegenerateWebhook,
  useUpdateApplication,
  useUpdateApplicationAuthToken,
  useUpdateApplicationEnv,
  useWebhook,
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
          <Environment app={app} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <Settings app={app} />
        </TabsContent>
        <TabsContent value="deployments" className="mt-6">
          <Deployments app={app} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Header({ app }: { app: Application }) {
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

type LogLevel = "info" | "warn" | "error" | "debug"
type LogLine = { ts: string; level: LogLevel; text: string }

const LEVEL_TEXT: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  debug: "text-muted-foreground/60",
  warn: "text-amber-400",
  error: "text-destructive",
}
const LEVEL_BG: Record<LogLevel, string> = {
  info: "",
  debug: "",
  warn: "bg-amber-400/5",
  error: "bg-destructive/5",
}

// parseLogLine pulls the Docker timestamp prefix (if present) off a raw line and
// guesses a level from its content so the view can colour-code it.
function parseLogLine(raw: string): LogLine {
  let text = raw
  let ts = ""
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2})?)\s+([\s\S]*)$/)
  if (m) {
    const d = new Date(m[1])
    if (!Number.isNaN(d.getTime())) ts = d.toLocaleTimeString("tr-TR", { hour12: false })
    text = m[2]
  }
  const low = text.toLowerCase()
  let level: LogLevel = "info"
  if (/(error|fatal|panic|başarısız)/.test(low)) level = "error"
  else if (/(warn|uyarı)/.test(low)) level = "warn"
  else if (/debug/.test(low)) level = "debug"
  return { ts, level, text }
}

function Logs({ app }: { app: Application }) {
  const building = app.status === "building"
  const live = building || app.status === "running"
  const [liveLog, setLiveLog] = useState("")
  const [filter, setFilter] = useState("")
  const [follow, setFollow] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

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
  const raw = building ? liveLog : (data?.logs ?? "")

  const lines = useMemo(
    () =>
      raw
        .split("\n")
        .filter((l) => l.trim() !== "")
        .map(parseLogLine),
    [raw],
  )
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return lines
    return lines.filter((l) => l.text.toLowerCase().includes(f) || l.level.includes(f))
  }, [lines, filter])

  // Stick to the bottom while following and new lines arrive.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-pin on every new batch of lines
  useEffect(() => {
    if (follow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered, follow])

  const copy = () => {
    const text = filtered.map((l) => (l.ts ? `${l.ts} ` : "") + l.text).join("\n")
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Loglar kopyalandı"))
      .catch(() => toast.error("Kopyalanamadı"))
  }

  const placeholder =
    building || isLoading
      ? "Yükleniyor…"
      : lines.length > 0
        ? "Eşleşen log yok."
        : "Henüz log yok. Uygulamayı dağıtın."

  return (
    <div className="flex h-140 flex-col overflow-hidden rounded-xl border bg-muted/20">
      <div className="flex flex-wrap items-center gap-2.5 border-b bg-muted/40 p-2.5">
        <div className="flex h-8 min-w-40 flex-1 items-center gap-2 rounded-md border bg-background px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Logları filtrele…"
            className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => setFollow((v) => !v)}
          className={`flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors ${
            follow
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="relative flex h-1.75 w-1.75">
            <span
              className={`absolute inset-0 rounded-full ${follow ? "bg-emerald-400" : "bg-muted-foreground"}`}
            />
            {follow && (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/80" />
            )}
          </span>
          {follow ? "Takip ediliyor" : "Takip et"}
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Copy className="h-3.5 w-3.5" /> Kopyala
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-2 font-mono text-xs leading-relaxed"
      >
        {filtered.length === 0 ? (
          <p className="px-3.5 py-3 text-muted-foreground">{placeholder}</p>
        ) : (
          <>
            {filtered.map((l, i) => (
              <div key={i} className={`flex gap-3 px-3.5 py-px ${LEVEL_BG[l.level]}`}>
                {l.ts && (
                  <span className="flex-none tabular-nums text-muted-foreground/50">{l.ts}</span>
                )}
                <span className={`w-11 flex-none font-medium uppercase ${LEVEL_TEXT[l.level]}`}>
                  {l.level}
                </span>
                <span className="break-words text-foreground/80">{l.text}</span>
              </div>
            ))}
            {live && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] text-muted-foreground/60">
                <span className="inline-block h-2.75 w-1.5 animate-pulse bg-emerald-400" />
                streaming · {filtered.length} satır
              </div>
            )}
          </>
        )}
      </div>
    </div>
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

type EnvRow = EnvVar & { reveal: boolean; rid: string }

let envRowSeq = 0
const newRid = () => `env-${envRowSeq++}`

// Keys that conventionally hold secrets get the masked toggle on by default.
const SECRET_HINT = /(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|API[_-]?KEY|_KEY$|CREDENTIAL)/i

// parseDotenv turns the contents of a .env file into env var rows. It handles
// blank lines, # comments, optional `export ` prefixes and surrounding quotes.
function parseDotenv(text: string): EnvVar[] {
  const out: EnvVar[] = []
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim()
    if (line === "" || line.startsWith("#")) continue
    if (line.startsWith("export ")) line = line.slice(7).trim()
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!key) continue
    let value = line.slice(eq + 1).trim()
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    out.push({ key, value, secret: SECRET_HINT.test(key) })
  }
  return out
}

const envSignature = (vars: { key: string; value: string; secret: boolean }[]) =>
  vars
    .filter((v) => v.key.trim() !== "")
    .map((v) => `${v.key} ${v.value} ${v.secret}`)
    .join("\n")

function Environment({ app }: { app: Application }) {
  const update = useUpdateApplicationEnv(app.id)
  const [rows, setRows] = useState<EnvRow[]>(() =>
    app.envVars.map((v) => ({ ...v, reveal: false, rid: newRid() })),
  )
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")

  const dirty = useMemo(() => envSignature(rows) !== envSignature(app.envVars), [rows, app.envVars])
  const count = rows.filter((r) => r.key.trim() !== "").length

  const setRow = (i: number, patch: Partial<EnvRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addRow = () =>
    setRows((rs) => [...rs, { key: "", value: "", secret: false, reveal: true, rid: newRid() }])
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i))

  const applyImport = () => {
    const parsed = parseDotenv(importText)
    if (parsed.length === 0) {
      toast.error("Geçerli değişken bulunamadı")
      return
    }
    // Merge by key: existing rows keep their place, imported values override,
    // brand-new keys are appended.
    setRows((rs) => {
      const map = new Map<string, EnvRow>()
      for (const r of rs) if (r.key.trim() !== "") map.set(r.key, r)
      for (const p of parsed) {
        const existing = map.get(p.key)
        map.set(p.key, { ...p, reveal: false, rid: existing?.rid ?? newRid() })
      }
      return [...map.values()]
    })
    setImportOpen(false)
    setImportText("")
    toast.success(`${parsed.length} değişken içe aktarıldı`)
  }

  const save = () =>
    update.mutate(
      rows.map(({ key, value, secret }) => ({ key, value, secret })),
      {
        onSuccess: () => toast.success("Ortam değişkenleri kaydedildi"),
        onError: (e) => toast.error(e.message),
      },
    )

  return (
    <Card className="max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-baseline gap-2 text-base">
          Ortam değişkenleri
          <span className="text-xs font-normal text-muted-foreground">{count} değişken</span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setImportOpen((v) => !v)}>
          <Upload className="h-3.5 w-3.5" /> .env içe aktar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {importOpen && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">.env içeriğini yapıştırın</p>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"NODE_ENV=production\nDATABASE_URL=postgres://...\nAPI_KEY=..."}
              className="min-h-28 font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
                Vazgeç
              </Button>
              <Button size="sm" disabled={importText.trim() === ""} onClick={applyImport}>
                Doldur
              </Button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            Henüz değişken yok. Ekleyin ya da bir <span className="font-mono">.env</span> içe
            aktarın.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className="flex-1">Key</span>
              <span className="flex-[1.4]">Value</span>
              <span className="w-37.5 shrink-0">Seçenekler</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.rid} className="flex items-center gap-2">
                <Input
                  value={r.key}
                  onChange={(e) => setRow(i, { key: e.target.value })}
                  placeholder="KEY"
                  className="h-9 flex-1 font-mono text-xs"
                />
                <div className="relative flex flex-[1.4] items-center">
                  <Input
                    value={r.value}
                    onChange={(e) => setRow(i, { value: e.target.value })}
                    placeholder="value"
                    type={r.secret && !r.reveal ? "password" : "text"}
                    className={`h-9 font-mono text-xs ${r.secret ? "pr-9" : ""}`}
                  />
                  {r.secret && (
                    <button
                      type="button"
                      onClick={() => setRow(i, { reveal: !r.reveal })}
                      title={r.reveal ? "Gizle" : "Göster"}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      {r.reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <div className="flex w-37.5 shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRow(i, { secret: !r.secret })}
                    className={`flex items-center gap-1.5 text-xs ${
                      r.secret ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`relative h-3.75 w-6.5 shrink-0 rounded-full transition-colors ${
                        r.secret ? "bg-primary" : "bg-input"
                      }`}
                    >
                      <span
                        className={`absolute top-[1.5px] h-3 w-3 rounded-full bg-background transition-all ${
                          r.secret ? "left-[12.5px]" : "left-[1.5px]"
                        }`}
                      />
                    </span>
                    Secret
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    title="Sil"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Değişken ekle
          </Button>
          <Button disabled={!dirty || update.isPending} onClick={save}>
            Kaydet
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Değişkenler sonraki dağıtımda container'a uygulanır.
        </p>
      </CardContent>
    </Card>
  )
}

// AuthTokenCard lets the user set, replace or clear the repository auth token
// after creation. The current token is never shown (write-only); only whether
// one is set. Only rendered for git apps.
function AuthTokenCard({ app }: { app: Application }) {
  const update = useUpdateApplicationAuthToken(app.id)
  const [token, setToken] = useState("")

  if (app.sourceType !== "git") return null

  const submit = (value: string, okMsg: string) =>
    update.mutate(value, {
      onSuccess: () => {
        setToken("")
        toast.success(okMsg)
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Auth token
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              app.hasAuthToken
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {app.hasAuthToken ? "Ayarlı" : "Yok"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Private repo'yu klonlamak için GitHub Personal Access Token. Mevcut değer güvenlik için
          gösterilmez; değiştirmek için yeni bir token gir. Sonraki dağıtımda geçerli olur.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={app.hasAuthToken ? "•••• yeni token ile değiştir" : "ghp_••••••••••••"}
            className="flex-1 font-mono text-xs"
          />
          <Button
            disabled={!token.trim() || update.isPending}
            onClick={() => submit(token.trim(), "Auth token güncellendi")}
          >
            Kaydet
          </Button>
        </div>
        {app.hasAuthToken && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={update.isPending}
            onClick={() => submit("", "Auth token kaldırıldı")}
          >
            <Trash2 className="h-3.5 w-3.5" /> Token'ı kaldır
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// WebhookCard shows the GitHub webhook URL and secret to configure on the app's
// repository so a push to its branch auto-deploys. Only shown for git apps.
function WebhookCard({ app }: { app: Application }) {
  const isGit = app.sourceType === "git"
  const { data: wh, isLoading } = useWebhook(app.id, isGit)
  const regen = useRegenerateWebhook(app.id)
  const [revealed, setRevealed] = useState(false)

  if (!isGit) return null

  const copy = (text: string, label: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} kopyalandı`))
      .catch(() => toast.error("Kopyalanamadı"))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">GitHub Webhook</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Bu URL ve secret'ı GitHub deposunda{" "}
          <span className="font-mono">Settings → Webhooks → Add webhook</span> altına ekle.{" "}
          <span className="font-mono text-foreground">{app.branch}</span> dalına her push'ta
          uygulama otomatik dağıtılır.
        </p>

        {isLoading || !wh ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <>
            <div className="space-y-2">
              <Label>Payload URL</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={wh.url} className="flex-1 font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(wh.url, "URL")}
                  aria-label="URL'i kopyala"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secret</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    value={revealed ? wh.secret : "•".repeat(wh.secret.length)}
                    className="pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? "Gizle" : "Göster"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(wh.secret, "Secret")}
                  aria-label="Secret'ı kopyala"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span>
                Content type: <span className="font-mono text-foreground">application/json</span> ·
                Event: <span className="font-mono text-foreground">push</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={regen.isPending}
                onClick={() =>
                  regen.mutate(undefined, {
                    onSuccess: () => {
                      setRevealed(true)
                      toast.success("Secret yenilendi")
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <RotateCw className="h-3.5 w-3.5" /> Secret'ı yenile
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Deployments({ app }: { app: Application }) {
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

function triggerLabel(trigger: string): string {
  return trigger === "manual" ? "Manuel" : trigger
}

function fmtStarted(ms: number): string {
  if (!ms) return "—"
  return new Date(ms).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function fmtDuration(d: Deployment): string {
  if (d.status === "building" || d.durationMs <= 0) return "…"
  const total = Math.round(d.durationMs / 1000)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const r = total % 60
  return `${m}m ${r.toString().padStart(2, "0")}s`
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-medium">{value}</span>
    </div>
  )
}
