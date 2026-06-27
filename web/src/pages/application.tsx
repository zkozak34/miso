import { Cpu, MemoryStick, Network, Play, RotateCw, Square } from "lucide-react"
import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsageAreaChart } from "@/components/dashboard/usage-area-chart"
import { StatusBadge } from "@/components/status-badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMockMetrics } from "@/hooks/use-mock-metrics"
import type { Application } from "@/lib/api/resources"
import { useApplication, useApplicationAction } from "@/lib/queries"

export function ApplicationPage() {
  const { projectId = "", envId = "", appId = "" } = useParams()
  const { data: app, isLoading } = useApplication(appId)

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
          <Placeholder title="Loglar" />
        </TabsContent>
        <TabsContent value="environment" className="mt-6">
          <Placeholder title="Ortam değişkenleri" />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <Placeholder title="Ayarlar" />
        </TabsContent>
        <TabsContent value="deployments" className="mt-6">
          <Placeholder title="Dağıtım geçmişi" />
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

function Overview({ app }: { app: Application }) {
  const running = app.status === "running"
  const { latest, history } = useMockMetrics(running)

  const cpuData = useMemo(() => history.map((p) => ({ cpu: Number(p.cpu.toFixed(1)) })), [history])
  const memData = useMemo(() => history.map((p) => ({ memory: Math.round(p.memory) })), [history])

  const ports = app.hostPort && app.containerPort ? `${app.hostPort}:${app.containerPort}` : "—"

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="CPU"
            icon={Cpu}
            accent="var(--chart-1)"
            value={`${latest.cpu.toFixed(1)}%`}
            percent={latest.cpu}
          />
          <StatCard
            title="Bellek"
            icon={MemoryStick}
            accent="var(--chart-2)"
            value={`${Math.round(latest.memory)} MB`}
            subtitle="/ 512 MB"
            percent={(latest.memory / 512) * 100}
          />
          <StatCard
            title="Ağ"
            icon={Network}
            accent="var(--chart-3)"
            value={`${Math.round(latest.netIn)} KB/s`}
            subtitle="↓ gelen"
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
