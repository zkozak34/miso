import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Plus, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Template, TemplateField } from "@/lib/api/resources"
import { useCreateApplication, useTemplates } from "@/lib/queries"
import { cn } from "@/lib/utils"

const schema = z.object({
  name: z.string().trim().min(1, "Uygulama adı zorunlu").max(60),
  repoUrl: z.string().trim().min(1, "Repo URL zorunlu"),
  branch: z.string().trim().min(1),
  dockerfilePath: z.string().trim().min(1),
  containerPort: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Sayı girin"),
  hostPort: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), "Sayı girin"),
  buildArgs: z.array(z.object({ key: z.string(), value: z.string() })),
  authToken: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function AddApplicationDialog({
  envId,
  open,
  onOpenChange,
}: {
  envId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState("git")
  const create = useCreateApplication(envId)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      repoUrl: "",
      branch: "main",
      dockerfilePath: "Dockerfile",
      containerPort: "",
      hostPort: "",
      buildArgs: [],
      authToken: "",
    },
  })
  const args = useFieldArray({ control: form.control, name: "buildArgs" })

  const onSubmit = form.handleSubmit((values) => {
    const buildArgs: Record<string, string> = {}
    for (const { key, value } of values.buildArgs) {
      if (key.trim()) buildArgs[key.trim()] = value
    }
    create.mutate(
      {
        name: values.name,
        sourceType: "git",
        repoUrl: values.repoUrl,
        branch: values.branch,
        dockerfilePath: values.dockerfilePath,
        buildArgs,
        authToken: values.authToken ?? "",
        containerPort: values.containerPort ? Number(values.containerPort) : null,
        hostPort: values.hostPort ? Number(values.hostPort) : null,
      },
      {
        onSuccess: () => {
          toast.success("Uygulama oluşturuldu")
          form.reset()
          onOpenChange(false)
        },
        onError: (e) => toast.error(e.message),
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-140">
        <DialogHeader>
          <DialogTitle>Uygulama ekle</DialogTitle>
          <DialogDescription>Bu environment'a yeni bir Docker container dağıt.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="git">Git</TabsTrigger>
            <TabsTrigger value="docker">Docker</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="git" className="mt-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app-name">Ad</Label>
                <Input id="app-name" placeholder="web" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="repo">Repository URL</Label>
                <Input
                  id="repo"
                  placeholder="github.com/acme/my-app"
                  {...form.register("repoUrl")}
                />
                {form.formState.errors.repoUrl && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.repoUrl.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" {...form.register("branch")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dockerfile">Dockerfile yolu</Label>
                  <Input id="dockerfile" {...form.register("dockerfilePath")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="container-port">Container port</Label>
                  <Input
                    id="container-port"
                    inputMode="numeric"
                    placeholder="3000"
                    {...form.register("containerPort")}
                  />
                  {form.formState.errors.containerPort && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.containerPort.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="host-port">Host port</Label>
                    <span className="text-xs text-muted-foreground">opsiyonel</span>
                  </div>
                  <Input
                    id="host-port"
                    inputMode="numeric"
                    placeholder="otomatik"
                    {...form.register("hostPort")}
                  />
                  {form.formState.errors.hostPort && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.hostPort.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Build args</Label>
                  <span className="text-xs text-muted-foreground">opsiyonel</span>
                </div>
                {args.fields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input placeholder="KEY" {...form.register(`buildArgs.${i}.key`)} />
                    <Input placeholder="value" {...form.register(`buildArgs.${i}.value`)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => args.remove(i)}
                      aria-label="Satırı sil"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => args.append({ key: "", value: "" })}
                >
                  <Plus className="h-3.5 w-3.5" /> Build arg ekle
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="token">Auth token</Label>
                  <span className="text-xs text-muted-foreground">private repo'lar için</span>
                </div>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_••••••••••••"
                  {...form.register("authToken")}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Vazgeç
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Oluşturuluyor…" : "Uygulama oluştur"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="docker" className="mt-4">
            <ComingSoon label="Docker image ile dağıtım" />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <TemplateForm envId={envId} onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

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
function TemplateForm({ envId, onClose }: { envId: string; onClose: () => void }) {
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

function FieldSelect({
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

function FieldInput({
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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-12 text-center">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Sonraki fazda gelecek.</p>
    </div>
  )
}
