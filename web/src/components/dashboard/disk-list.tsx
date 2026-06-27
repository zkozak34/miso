import { HardDrive } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type DiskStats, formatBytes } from "@/lib/api"

function barColor(percent: number): string {
  if (percent >= 90) return "var(--destructive)"
  if (percent >= 75) return "var(--chart-4)"
  return "var(--chart-2)"
}

export function DiskList({ disks }: { disks: DiskStats[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Disk Kullanımı</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {disks.length === 0 && <p className="text-sm text-muted-foreground">Veri yok.</p>}
        {disks.map((d) => (
          <div key={d.mountpoint} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium text-sm" title={d.mountpoint}>
                {d.mountpoint}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {formatBytes(d.used)} / {formatBytes(d.total)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${d.usedPercent}%`, backgroundColor: barColor(d.usedPercent) }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {d.usedPercent.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
