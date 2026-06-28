import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, X } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateApplication } from "@/lib/queries"

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

export function GitApplicationForm({ envId, onClose }: { envId: string; onClose: () => void }) {
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
          onClose()
        },
        onError: (e) => toast.error(e.message),
      },
    )
  })

  return (
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
        <Input id="repo" placeholder="github.com/acme/my-app" {...form.register("repoUrl")} />
        {form.formState.errors.repoUrl && (
          <p className="text-xs text-destructive">{form.formState.errors.repoUrl.message}</p>
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
            <p className="text-xs text-destructive">{form.formState.errors.hostPort.message}</p>
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
