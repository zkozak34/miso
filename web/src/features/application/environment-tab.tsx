import { Eye, EyeOff, Plus, Trash2, Upload, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Application, EnvVar } from "@/lib/api/resources"
import { useUpdateApplicationEnv } from "@/lib/queries"
import { envSignature, parseDotenv } from "./parse-dotenv"

type EnvRow = EnvVar & { reveal: boolean; rid: string }

let envRowSeq = 0
const newRid = () => `env-${envRowSeq++}`

export function EnvironmentTab({ app }: { app: Application }) {
  const update = useUpdateApplicationEnv(app.id)
  const [rows, setRows] = useState<EnvRow[]>(() =>
    app.envVars.map((v) => ({ ...v, reveal: false, rid: newRid() })),
  )
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")

  const dirty = useMemo(() => envSignature(rows) !== envSignature(app.envVars), [rows, app.envVars])
  const count = rows.filter((r) => r.key.trim() !== "").length

  const setRow = (i: number, patch: Partial<EnvRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addRow = () =>
    setRows((rs) => [...rs, { key: "", value: "", secret: false, reveal: true, rid: newRid() }])
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i))

  const applyImport = () => {
    const parsed = parseDotenv(importText)
    if (parsed.length === 0) {
      toast.error("Geçerli değişken bulunamadı")
      return
    }
    // Merge by key: existing rows keep their place, imported values override,
    // brand-new keys are appended.
    setRows((rs) => {
      const map = new Map<string, EnvRow>()
      for (const r of rs) if (r.key.trim() !== "") map.set(r.key, r)
      for (const p of parsed) {
        const existing = map.get(p.key)
        map.set(p.key, { ...p, reveal: false, rid: existing?.rid ?? newRid() })
      }
      return [...map.values()]
    })
    setImportOpen(false)
    setImportText("")
    toast.success(`${parsed.length} değişken içe aktarıldı`)
  }

  const save = () =>
    update.mutate(
      rows.map(({ key, value, secret }) => ({ key, value, secret })),
      {
        onSuccess: () => toast.success("Ortam değişkenleri kaydedildi"),
        onError: (e) => toast.error(e.message),
      },
    )

  return (
    <Card className="max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-baseline gap-2 text-base">
          Ortam değişkenleri
          <span className="text-xs font-normal text-muted-foreground">{count} değişken</span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => setImportOpen((v) => !v)}>
          <Upload className="h-3.5 w-3.5" /> .env içe aktar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {importOpen && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">.env içeriğini yapıştırın</p>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"NODE_ENV=production\nDATABASE_URL=postgres://...\nAPI_KEY=..."}
              className="min-h-28 font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(false)}>
                Vazgeç
              </Button>
              <Button size="sm" disabled={importText.trim() === ""} onClick={applyImport}>
                Doldur
              </Button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            Henüz değişken yok. Ekleyin ya da bir <span className="font-mono">.env</span> içe
            aktarın.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span className="flex-1">Key</span>
              <span className="flex-[1.4]">Value</span>
              <span className="w-37.5 shrink-0">Seçenekler</span>
            </div>
            {rows.map((r, i) => (
              <div key={r.rid} className="flex items-center gap-2">
                <Input
                  value={r.key}
                  onChange={(e) => setRow(i, { key: e.target.value })}
                  placeholder="KEY"
                  className="h-9 flex-1 font-mono text-xs"
                />
                <div className="relative flex flex-[1.4] items-center">
                  <Input
                    value={r.value}
                    onChange={(e) => setRow(i, { value: e.target.value })}
                    placeholder="value"
                    type={r.secret && !r.reveal ? "password" : "text"}
                    className={`h-9 font-mono text-xs ${r.secret ? "pr-9" : ""}`}
                  />
                  {r.secret && (
                    <button
                      type="button"
                      onClick={() => setRow(i, { reveal: !r.reveal })}
                      title={r.reveal ? "Gizle" : "Göster"}
                      className="absolute right-2 text-muted-foreground hover:text-foreground"
                    >
                      {r.reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <div className="flex w-37.5 shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRow(i, { secret: !r.secret })}
                    className={`flex items-center gap-1.5 text-xs ${r.secret ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span
                      className={`relative h-3.75 w-6.5 shrink-0 rounded-full transition-colors ${r.secret ? "bg-primary" : "bg-input"}`}
                    >
                      <span
                        className={`absolute top-[1.5px] h-3 w-3 rounded-full bg-background transition-all ${r.secret ? "left-[12.5px]" : "left-[1.5px]"}`}
                      />
                    </span>
                    Secret
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    title="Sil"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Değişken ekle
          </Button>
          <Button disabled={!dirty || update.isPending} onClick={save}>
            Kaydet
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Değişkenler sonraki dağıtımda container'a uygulanır.
        </p>
      </CardContent>
    </Card>
  )
}
