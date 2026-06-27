import { zodResolver } from "@hookform/resolvers/zod"
import { Settings2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { useSettings } from "@/components/settings-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const schema = z.object({
  chartPoints: z.coerce.number().int("Tam sayı olmalı").min(10, "En az 10").max(60, "En fazla 60"),
  decimals: z.coerce.number().int().min(0).max(2),
  showPerCore: z.enum(["true", "false"]),
})

type FormValues = z.input<typeof schema>

export function SettingsDialog() {
  const { settings, update } = useSettings()
  const [open, setOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      chartPoints: settings.chartPoints,
      decimals: settings.decimals,
      showPerCore: settings.showPerCore ? "true" : "false",
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    const parsed = schema.parse(values)
    update({
      chartPoints: parsed.chartPoints,
      decimals: parsed.decimals,
      showPerCore: parsed.showPerCore === "true",
    })
    toast.success("Ayarlar kaydedildi")
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Ayarlar">
          <Settings2 className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ayarlar</DialogTitle>
          <DialogDescription>Görüntüleme tercihlerini düzenle.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chartPoints">Grafik geçmişi (nokta sayısı)</Label>
            <Input id="chartPoints" type="number" {...form.register("chartPoints")} />
            {form.formState.errors.chartPoints && (
              <p className="text-xs text-destructive">
                {form.formState.errors.chartPoints.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="decimals">Boyut ondalık basamağı</Label>
            <Select
              defaultValue={String(settings.decimals)}
              onValueChange={(v) => form.setValue("decimals", Number(v) as FormValues["decimals"])}
            >
              <SelectTrigger id="decimals">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 (örn. 12 GB)</SelectItem>
                <SelectItem value="1">1 (örn. 12.3 GB)</SelectItem>
                <SelectItem value="2">2 (örn. 12.34 GB)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="showPerCore">Çekirdek başına CPU</Label>
            <Select
              defaultValue={settings.showPerCore ? "true" : "false"}
              onValueChange={(v) => form.setValue("showPerCore", v as FormValues["showPerCore"])}
            >
              <SelectTrigger id="showPerCore">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Göster</SelectItem>
                <SelectItem value="false">Gizle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit">Kaydet</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
