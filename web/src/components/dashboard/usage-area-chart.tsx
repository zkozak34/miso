import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts"

interface Series {
  key: string
  color: string
  label: string
}

interface UsageAreaChartProps {
  data: Array<Record<string, number>>
  series: Series[]
  /** When set, Y axis is fixed to [0, yMax] (e.g. 100 for percentages). */
  yMax?: number
  /** Formats values in the tooltip. */
  format?: (value: number) => string
  /** Compact sparkline mode: no axes, no tooltip, no grid. */
  compact?: boolean
  height?: number
}

export function UsageAreaChart({
  data,
  series,
  yMax,
  format = (v) => v.toFixed(1),
  compact = false,
  height = 220,
}: UsageAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={compact ? "100%" : height}>
      <AreaChart
        data={data}
        margin={
          compact
            ? { top: 2, bottom: 0, left: 0, right: 0 }
            : { top: 8, right: 8, bottom: 0, left: 0 }
        }
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        {!compact && (
          <YAxis
            domain={yMax ? [0, yMax] : [0, "auto"]}
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => format(v)}
          />
        )}
        {!compact && (
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ display: "none" }}
            formatter={(value, name) => [format(Number(value)), name as string]}
          />
        )}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
            isAnimationActive={false}
            dot={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
