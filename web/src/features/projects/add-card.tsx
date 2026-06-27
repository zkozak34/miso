import { Plus } from "lucide-react"

export function AddCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-26 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2 text-text-tertiary transition-colors hover:border-primary hover:bg-card hover:text-primary"
    >
      <span className="flex h-8.5 w-8.5 items-center justify-center rounded-[9px] border border-border-strong bg-card text-xl font-light leading-none">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-[12.5px] font-medium">{label}</span>
    </button>
  )
}
