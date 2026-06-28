import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApplicationHeader } from "@/features/application/application-header"
import { DeploymentsTab } from "@/features/application/deployments-tab"
import { EnvironmentTab } from "@/features/application/environment-tab"
import { LogsTab } from "@/features/application/logs-tab"
import { OverviewTab } from "@/features/application/overview-tab"
import { SettingsTab } from "@/features/application/settings-tab"
import { useApplication } from "@/lib/queries"

export function ApplicationPage() {
  const { projectId = "", envId = "", appId = "" } = useParams()
  const navigate = useNavigate()
  const { data: app, isLoading, isError } = useApplication(appId)

  useEffect(() => {
    if (isError) navigate(`/projects/${projectId}/environments/${envId}`, { replace: true })
  }, [isError, navigate, projectId, envId])

  if (isLoading || !app) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects">Projeler</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectId}`} className="font-mono">
                {app.projectName}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectId}/environments/${envId}`} className="font-mono">
                {app.environmentName}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{app.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ApplicationHeader app={app} />

      {app.status === "failed" && app.lastError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="font-medium text-destructive">Son dağıtım başarısız oldu</p>
            <p className="mt-0.5 wrap-break-word font-mono text-xs text-muted-foreground">
              {app.lastError}
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab app={app} />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <LogsTab app={app} />
        </TabsContent>
        <TabsContent value="environment" className="mt-6">
          <EnvironmentTab app={app} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab app={app} />
        </TabsContent>
        <TabsContent value="deployments" className="mt-6">
          <DeploymentsTab app={app} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
