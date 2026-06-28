import { Cpu, MemoryStick, Network } from "lucide-react"
import { useMemo } from "react"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsageAreaChart } from "@/components/dashboard/usage-area-chart"
import { StatusBadge } from "@/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatBytes } from "@/lib/api"
import type { Application } from "@/lib/api/resources"
import { DetailRow } from "./detail-row"
import { useStatsHistory } from "./use-stats-history"

const MB = 1024 * 1024

export function OverviewTab({ app }: { app: Application }) {
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
