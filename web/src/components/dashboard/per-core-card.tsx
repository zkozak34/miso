import { Cpu } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function coreColor(percent: number): string {
  if (percent >= 85) return "var(--destructive)"
  if (percent >= 60) return "var(--chart-4)"
  return "var(--chart-1)"
}

export function PerCoreCard({ perCore }: { perCore: number[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Cpu className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Çekirdek Başına CPU</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {perCore.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">#{i}</span>
                <span className="tabular-nums font-medium">{p.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${p}%`, backgroundColor: coreColor(p) }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
