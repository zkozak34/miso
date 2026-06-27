import { Plus } from "lucide-react"

export function AddCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[104px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted transition-colors group-hover:bg-accent">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-sm">{label}</span>
    </button>
  )
}
