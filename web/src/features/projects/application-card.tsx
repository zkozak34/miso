import type { LucideIcon } from "lucide-react"
import { Box, GitBranch, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { StatusBadge } from "@/components/status-badge"
import { Card } from "@/components/ui/card"
import type { Application, AppSource } from "@/lib/api/resources"

const SOURCE: Record<AppSource, { label: string; icon: LucideIcon }> = {
  git: { label: "Git", icon: GitBranch },
  docker: { label: "Docker", icon: Box },
  template: { label: "Template", icon: Sparkles },
}

export function ApplicationCard({ app, to }: { app: Application; to: string }) {
  const navigate = useNavigate()
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
        <StatusBadge status={app.status} />
      </div>

      <p className="truncate font-mono text-sm text-muted-foreground">
        {app.repoUrl || app.image || "—"}
      </p>
      {ports && <p className="font-mono text-xs text-muted-foreground">⇄ {ports}</p>}
    </Card>
  )
}
