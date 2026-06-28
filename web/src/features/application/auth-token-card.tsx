import { Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Application } from "@/lib/api/resources"
import { useUpdateApplicationAuthToken } from "@/lib/queries"

// AuthTokenCard lets the user set, replace or clear the repository auth token
// after creation. The current token is never shown (write-only); only whether
// one is set. Only rendered for git apps.
export function AuthTokenCard({ app }: { app: Application }) {
  const update = useUpdateApplicationAuthToken(app.id)
  const [token, setToken] = useState("")

  if (app.sourceType !== "git") return null

  const submit = (value: string, okMsg: string) =>
    update.mutate(value, {
      onSuccess: () => {
        setToken("")
        toast.success(okMsg)
      },
      onError: (e) => toast.error(e.message),
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Auth token
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              app.hasAuthToken
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {app.hasAuthToken ? "Ayarlı" : "Yok"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Private repo'yu klonlamak için GitHub Personal Access Token. Mevcut değer güvenlik için
          gösterilmez; değiştirmek için yeni bir token gir. Sonraki dağıtımda geçerli olur.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={app.hasAuthToken ? "•••• yeni token ile değiştir" : "ghp_••••••••••••"}
            className="flex-1 font-mono text-xs"
          />
          <Button
            disabled={!token.trim() || update.isPending}
            onClick={() => submit(token.trim(), "Auth token güncellendi")}
          >
            Kaydet
          </Button>
        </div>
        {app.hasAuthToken && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={update.isPending}
            onClick={() => submit("", "Auth token kaldırıldı")}
          >
            <Trash2 className="h-3.5 w-3.5" /> Token'ı kaldır
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
