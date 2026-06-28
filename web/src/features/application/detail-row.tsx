// DetailRow is a shared label/value line used by the overview and settings tabs.
export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate text-right text-sm font-medium">{value}</span>
    </div>
  )
}
