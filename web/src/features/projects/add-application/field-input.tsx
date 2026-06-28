import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { TemplateField } from "@/lib/api/resources"
import { cn } from "@/lib/utils"

export function FieldInput({
  field,
  value,
  error,
  revealed,
  onToggleReveal,
  onChange,
}: {
  field: TemplateField
  value: string
  error?: string
  revealed: boolean
  onToggleReveal: () => void
  onChange: (v: string) => void
}) {
  const isPassword = field.type === "password"
  return (
    <div className="space-y-2">
      <Label htmlFor={`tpl-${field.key}`}>{field.label}</Label>
      <div className="relative">
        <Input
          id={`tpl-${field.key}`}
          type={isPassword && !revealed ? "password" : "text"}
          inputMode={field.type === "port" ? "numeric" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.help ?? field.default ?? ""}
          className={cn("font-mono", isPassword && "pr-9")}
        />
        {isPassword && (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={revealed ? "Gizle" : "Göster"}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
