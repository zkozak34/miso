import { Server } from "lucide-react"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchSystemInfo, formatBytes, formatUptime, type SystemInfo } from "@/lib/api"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right tabular-nums">{value}</span>
    </div>
  )
}

export function SystemInfoCard() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    fetchSystemInfo(ac.signal)
      .then(setInfo)
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e))
      })
    return () => ac.abort()
  }, [])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Server className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Sistem Bilgisi</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!info && !error && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
        {info && (
          <div className="flex flex-col">
            <Row label="Hostname" value={info.hostname} />
            <Row
              label="İşletim Sistemi"
              value={
                <span className="inline-flex items-center gap-2">
                  {info.platform} {info.platformVersion}
                  <Badge variant="secondary">{info.kernelArch}</Badge>
                </span>
              }
            />
            <Row label="Kernel" value={info.kernelVersion} />
            <Row label="İşlemci" value={info.cpuModel || "—"} />
            <Row label="Çekirdek" value={`${info.cpuCores} çekirdek`} />
            <Row label="Toplam RAM" value={formatBytes(info.totalMemory)} />
            <Row label="Çalışma Süresi" value={formatUptime(info.uptime)} />
            <Row label="Süreç Sayısı" value={info.procs} />
            <Row label="Go" value={info.goVersion} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
