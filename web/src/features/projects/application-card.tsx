import type { LucideIcon } from "lucide-react"
import { Box, GitBranch, MoreHorizontal, Sparkles } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { StatusBadge } from "@/components/status-badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Application, AppSource } from "@/lib/api/resources"
import { useDeleteApplication } from "@/lib/queries"

const SOURCE: Record<AppSource, { label: string; icon: LucideIcon }> = {
  git: { label: "Git", icon: GitBranch },
  docker: { label: "Docker", icon: Box },
  template: { label: "Template", icon: Sparkles },
}

export function ApplicationCard({ app, to }: { app: Application; to: string }) {
  const navigate = useNavigate()
  const del = useDeleteApplication(app.environmentId)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const source = SOURCE[app.sourceType] ?? SOURCE.git
  const SourceIcon = source.icon
  const ports = app.hostPort && app.containerPort ? `${app.hostPort}:${app.containerPort}` : null

  return (
    <Card
      onClick={() => navigate(to)}
      className="cursor-pointer gap-3 p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-[14.5px] font-medium tracking-tight">{app.name}</h3>
          <span className="inline-flex h-5 flex-none items-center gap-1.5 rounded-[5px] border bg-surface-2 px-1.5">
            <SourceIcon className="h-3 w-3 text-text-tertiary" />
            <span className="text-[10.5px] font-medium text-muted-foreground">{source.label}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={app.status} />
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(to)}>Aç</DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  setTimeout(() => setConfirmOpen(true), 0)
                }}
              >
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <p className="truncate font-mono text-sm text-muted-foreground">
        {app.repoUrl || app.image || "—"}
      </p>
      {ports && <p className="font-mono text-xs text-muted-foreground">⇄ {ports}</p>}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Uygulamayı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{app.name}</span> kalıcı olarak silinecek. Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                del.mutate(app.id, {
                  onSuccess: () => toast.success("Uygulama silindi"),
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
