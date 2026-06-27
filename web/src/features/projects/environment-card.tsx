import { Box } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { StatusBadge } from "@/components/status-badge"
import { Card } from "@/components/ui/card"
import type { Environment } from "@/lib/api/resources"

export function EnvironmentCard({ environment }: { environment: Environment }) {
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => navigate(`/projects/${environment.projectId}/environments/${environment.id}`)}
      className="cursor-pointer gap-3.5 p-4.25 transition-all duration-150 hover:-translate-y-px hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-base font-semibold tracking-tight">{environment.name}</h3>
        <StatusBadge status={environment.status} />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Box className="h-3.5 w-3.5" />
        {environment.appCount} uygulama
      </div>
    </Card>
  )
}
