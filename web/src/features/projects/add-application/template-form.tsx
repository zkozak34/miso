import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { Template } from "@/lib/api/resources"
import { useCreateApplication, useTemplates } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { ComingSoon } from "./coming-soon"
import { FieldInput } from "./field-input"
import { FieldSelect } from "./field-select"

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/

// defaultsFor returns the initial value map for a template's fields.
function defaultsFor(t: Template): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of t.fields) out[f.key] = f.default ?? ""
  return out
}

// TemplateForm renders a one-click template (PostgreSQL, …) entirely from the
// catalog the backend serves: the picker cards and every input are driven by
// the template's declared fields, so new templates need no UI changes here.
export function TemplateForm({ envId, onClose }: { envId: string; onClose: () => void }) {
  const { data: templates, isLoading } = useTemplates()
  const create = useCreateApplication(envId)

  const [selectedId, setSelectedId] = useState("")
  const [name, setName] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})
  const [reveal, setReveal] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selected = useMemo<Template | undefined>(
    () => templates?.find((t) => t.id === selectedId) ?? templates?.[0],
    [templates, selectedId],
  )

  // When the chosen template changes, seed its field defaults and suggest the
  // template id as the app name (keeping any name the user has already typed).
  useEffect(() => {
    if (!selected) return
    setValues(defaultsFor(selected))
    setErrors({})
    setName((prev) => prev || selected.id)
  }, [selected])

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-lg" />
  }
  if (!templates || templates.length === 0 || !selected) {
    return <ComingSoon label="Şablon kataloğu boş" />
  }

  const setValue = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }))
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const n = name.trim()
    if (!n) errs.name = "Uygulama adı zorunlu"
    else if (!NAME_RE.test(n)) errs.name = "Küçük harf, rakam ve tire"

    const templateValues: Record<string, string> = {}
    for (const f of selected.fields) {
      const v = (values[f.key] ?? f.default ?? "").trim()
      templateValues[f.key] = v
      if (f.required && !v) errs[f.key] = `${f.label} zorunlu`
    }
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    create.mutate(
      {
        name: n,
        sourceType: "template",
        templateId: selected.id,
        templateValues,
        repoUrl: "",
        branch: "",
        dockerfilePath: "",
        buildArgs: {},
        authToken: "",
      },
      {
        onSuccess: () => {
          toast.success("Uygulama oluşturuldu")
          onClose()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  const selectFields = selected.fields.filter((f) => f.type === "select")
  const inputFields = selected.fields.filter((f) => f.type !== "select")

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tpl-name">Ad</Label>
        <Input
          id="tpl-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) setErrors((x) => ({ ...x, name: "" }))
          }}
          placeholder="postgres"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {templates.map((t) => {
          const active = t.id === selected.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "relative flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                active ? "border-primary bg-card" : "border-border bg-muted/40 hover:border-input",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-sm"
                  style={{ color: t.color, backgroundColor: `${t.color}1f` }}
                >
                  {t.icon}
                </span>
                <span className="text-sm font-semibold">{t.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </button>
          )
        })}
        <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-input bg-muted/30 p-3 text-center text-muted-foreground">
          <span className="text-xs font-medium">Yakında</span>
          <span className="text-[11px]">Redis, MySQL, MongoDB…</span>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selected.name} ayarları
        </p>
        {selectFields.map((f) => (
          <FieldSelect
            key={f.key}
            field={f}
            value={values[f.key] ?? ""}
            onChange={(v) => setValue(f.key, v)}
          />
        ))}
        <div className="grid grid-cols-2 gap-3">
          {inputFields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key] ?? ""}
              error={errors[f.key]}
              revealed={!!reveal[f.key]}
              onToggleReveal={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
              onChange={(v) => setValue(f.key, v)}
            />
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Vazgeç
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Oluşturuluyor…" : "Uygulama oluştur"}
        </Button>
      </DialogFooter>
    </form>
  )
}
