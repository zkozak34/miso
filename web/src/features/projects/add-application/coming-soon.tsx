export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-12 text-center">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Sonraki fazda gelecek.</p>
    </div>
  )
}
