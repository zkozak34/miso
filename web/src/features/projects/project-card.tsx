import { Box, Layers } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { StatusBadge } from "@/components/status-badge"
import { Card } from "@/components/ui/card"
import type { Project } from "@/lib/api/resources"

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => navigate(`/projects/${project.id}`)}
      className="cursor-pointer gap-3.5 p-4.25 transition-all duration-150 hover:-translate-y-px hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-base font-semibold tracking-tight">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="line-clamp-1 text-sm text-muted-foreground">{project.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          {project.environmentCount} environment
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5" />
          {project.appCount} uygulama
        </span>
      </div>
    </Card>
  )
}
