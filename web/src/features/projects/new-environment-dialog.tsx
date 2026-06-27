import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { useCreateEnvironment } from "@/lib/queries"

const schema = z.object({
  name: z.string().trim().min(1, "Environment adı zorunlu").max(60, "En fazla 60 karakter"),
})

type FormValues = z.infer<typeof schema>

export function NewEnvironmentDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateEnvironment(projectId)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values.name, {
      onSuccess: () => {
        toast.success("Environment oluşturuldu")
        form.reset()
        onOpenChange(false)
      },
      onError: (e) => toast.error(e.message),
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni environment</DialogTitle>
          <DialogDescription>Projeyi ortamlara ayır (production, staging…).</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="env-name">Environment adı</Label>
            <Input id="env-name" placeholder="production" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Oluşturuluyor…" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
