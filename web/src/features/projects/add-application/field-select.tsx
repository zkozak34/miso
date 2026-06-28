import { Label } from "@/components/ui/label"
import type { TemplateField } from "@/lib/api/resources"
import { cn } from "@/lib/utils"

export function FieldSelect({
  field,
  value,
  onChange,
}: {
  field: TemplateField
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {field.options?.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "h-8 rounded-md border px-3 font-mono text-xs transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-input",
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
