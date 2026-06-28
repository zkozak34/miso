import { Copy, Eye, EyeOff, RotateCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { Application } from "@/lib/api/resources"
import { useRegenerateWebhook, useWebhook } from "@/lib/queries"

// WebhookCard shows the GitHub webhook URL and secret to configure on the app's
// repository so a push to its branch auto-deploys. Only shown for git apps.
export function WebhookCard({ app }: { app: Application }) {
  const isGit = app.sourceType === "git"
  const { data: wh, isLoading } = useWebhook(app.id, isGit)
  const regen = useRegenerateWebhook(app.id)
  const [revealed, setRevealed] = useState(false)

  if (!isGit) return null

  const copy = (text: string, label: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} kopyalandı`))
      .catch(() => toast.error("Kopyalanamadı"))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">GitHub Webhook</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Bu URL ve secret'ı GitHub deposunda{" "}
          <span className="font-mono">Settings → Webhooks → Add webhook</span> altına ekle.{" "}
          <span className="font-mono text-foreground">{app.branch}</span> dalına her push'ta
          uygulama otomatik dağıtılır.
        </p>

        {isLoading || !wh ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : (
          <>
            <div className="space-y-2">
              <Label>Payload URL</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={wh.url} className="flex-1 font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(wh.url, "URL")}
                  aria-label="URL'i kopyala"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secret</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    value={revealed ? wh.secret : "•".repeat(wh.secret.length)}
                    className="pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    aria-label={revealed ? "Gizle" : "Göster"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copy(wh.secret, "Secret")}
                  aria-label="Secret'ı kopyala"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span>
                Content type: <span className="font-mono text-foreground">application/json</span> ·
                Event: <span className="font-mono text-foreground">push</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={regen.isPending}
                onClick={() =>
                  regen.mutate(undefined, {
                    onSuccess: () => {
                      setRevealed(true)
                      toast.success("Secret yenilendi")
                    },
                    onError: (e) => toast.error(e.message),
                  })
                }
              >
                <RotateCw className="h-3.5 w-3.5" /> Secret'ı yenile
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
