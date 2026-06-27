import { Activity, Cpu, HardDrive, MemoryStick, Network } from "lucide-react"
import { useMemo } from "react"
import { useSettings } from "@/components/settings-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Snapshot } from "@/lib/api"
import { formatBitsPerSec, formatBytes } from "@/lib/api"
import { DiskList } from "./disk-list"
import { PerCoreCard } from "./per-core-card"
import { StatCard } from "./stat-card"
import { SystemInfoCard } from "./system-info-card"
import { UsageAreaChart } from "./usage-area-chart"

interface DashboardProps {
  latest: Snapshot | null
  history: Snapshot[]
}

export function Dashboard({ latest, history }: DashboardProps) {
  const { settings } = useSettings()

  const points = settings.chartPoints
  const fmtBytes = (b: number) => formatBytes(b, settings.decimals)

  const cpuMemData = useMemo(
    () =>
      history.slice(-points).map((s) => ({
        cpu: Number(s.cpu.usedPercent.toFixed(1)),
        mem: Number(s.memory.usedPercent.toFixed(1)),
      })),
    [history, points],
  )

  const netData = useMemo(
    () =>
      history.slice(-points).map((s) => ({
        recv: Math.round(s.network.recvPerSec),
        sent: Math.round(s.network.sentPerSec),
      })),
    [history, points],
  )

  const rootDisk = latest?.disks.find((d) => d.mountpoint === "/") ?? latest?.disks[0]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="CPU"
          icon={Cpu}
          accent="var(--chart-1)"
          value={`${(latest?.cpu.usedPercent ?? 0).toFixed(1)}%`}
          subtitle={`${latest?.cpu.cores ?? 0} çekirdek`}
          percent={latest?.cpu.usedPercent}
        >
          <UsageAreaChart
            compact
            data={cpuMemData}
            series={[{ key: "cpu", color: "var(--chart-1)", label: "CPU" }]}
          />
        </StatCard>

        <StatCard
          title="Bellek"
          icon={MemoryStick}
          accent="var(--chart-2)"
          value={`${(latest?.memory.usedPercent ?? 0).toFixed(1)}%`}
          subtitle={
            latest ? `${fmtBytes(latest.memory.used)} / ${fmtBytes(latest.memory.total)}` : "—"
          }
          percent={latest?.memory.usedPercent}
        >
          <UsageAreaChart
            compact
            data={cpuMemData}
            series={[{ key: "mem", color: "var(--chart-2)", label: "Bellek" }]}
          />
        </StatCard>

        <StatCard
          title="Disk (kök)"
          icon={HardDrive}
          accent="var(--chart-4)"
          value={`${(rootDisk?.usedPercent ?? 0).toFixed(1)}%`}
          subtitle={rootDisk ? `${fmtBytes(rootDisk.used)} / ${fmtBytes(rootDisk.total)}` : "—"}
          percent={rootDisk?.usedPercent}
        />

        <StatCard
          title="Ağ"
          icon={Network}
          accent="var(--chart-3)"
          value={
            <span className="flex flex-col text-base leading-tight">
              <span className="tabular-nums">
                ↓ {formatBitsPerSec(latest?.network.recvPerSec ?? 0)}
              </span>
              <span className="tabular-nums">
                ↑ {formatBitsPerSec(latest?.network.sentPerSec ?? 0)}
              </span>
            </span>
          }
          subtitle={
            latest
              ? `Toplam ↓${fmtBytes(latest.network.bytesRecv)} ↑${fmtBytes(latest.network.bytesSent)}`
              : "—"
          }
        >
          <UsageAreaChart
            compact
            data={netData}
            series={[{ key: "recv", color: "var(--chart-3)", label: "Gelen" }]}
          />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">CPU & Bellek (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageAreaChart
              data={cpuMemData}
              yMax={100}
              format={(v) => `${v.toFixed(0)}%`}
              series={[
                { key: "cpu", color: "var(--chart-1)", label: "CPU" },
                { key: "mem", color: "var(--chart-2)", label: "Bellek" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Network className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Ağ Trafiği</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageAreaChart
              data={netData}
              format={(v) => formatBitsPerSec(v)}
              series={[
                { key: "recv", color: "var(--chart-3)", label: "Gelen" },
                { key: "sent", color: "var(--chart-5)", label: "Giden" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {settings.showPerCore && latest && latest.cpu.perCore.length > 0 && (
        <PerCoreCard perCore={latest.cpu.perCore} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DiskList disks={latest?.disks ?? []} />
        <SystemInfoCard />
      </div>
    </div>
  )
}
