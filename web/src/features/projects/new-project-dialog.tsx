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
import { Textarea } from "@/components/ui/textarea"
import { useCreateProject } from "@/lib/queries"

const schema = z.object({
  name: z.string().trim().min(1, "Proje adı zorunlu").max(60, "En fazla 60 karakter"),
  description: z.string().trim().max(280, "En fazla 280 karakter").optional(),
})

type FormValues = z.infer<typeof schema>

export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const create = useCreateProject()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  })

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, {
      onSuccess: () => {
        toast.success("Proje oluşturuldu")
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
          <DialogTitle>Yeni proje</DialogTitle>
          <DialogDescription>Uygulamalarını projelere göre grupla.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Proje adı</Label>
            <Input id="name" placeholder="storefront" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">
              Açıklama <span className="text-muted-foreground">(opsiyonel)</span>
            </Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="E-ticaret platformu"
              {...form.register("description")}
            />
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
