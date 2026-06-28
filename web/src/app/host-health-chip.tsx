import { useSystemInfo } from "@/lib/queries"

export function HostHealthChip() {
  const { data } = useSystemInfo()
  const host = data?.hostname ?? "node"
  return (
    <div className="flex h-7.5 items-center gap-2 rounded-[7px] border bg-card px-2.5">
      <span className="relative flex h-1.75 w-1.75 flex-none">
        <span className="absolute inset-0 rounded-full bg-emerald-400" />
        <span
          className="absolute inset-0 rounded-full bg-emerald-400"
          style={{ animation: "ringPulse 2.4s ease-out infinite" }}
        />
      </span>
      <span className="font-mono text-xs text-muted-foreground">{host}</span>
      <span className="text-[11.5px] font-medium text-emerald-400">Healthy</span>
    </div>
  )
}
