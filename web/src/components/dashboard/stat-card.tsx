import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  icon: LucideIcon
  value: ReactNode
  subtitle?: ReactNode
  /** 0–100; renders an accent bar when provided. */
  percent?: number
  accent?: string // CSS color, e.g. var(--chart-1)
  children?: ReactNode // optional sparkline area
}

export function StatCard({
  title,
  icon: Icon,
  value,
  subtitle,
  percent,
  accent = "var(--chart-1)",
  children,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden gap-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {percent !== undefined && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500")}
              style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: accent }}
            />
          </div>
        )}
      </CardContent>
      {children && <div className="h-12 w-full">{children}</div>}
    </Card>
  )
}
