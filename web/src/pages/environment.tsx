import { Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AddApplicationDialog } from "@/features/projects/add-application-dialog"
import { AddCard } from "@/features/projects/add-card"
import { ApplicationCard } from "@/features/projects/application-card"
import { useApplications, useDeleteEnvironment, useEnvironment } from "@/lib/queries"

export function EnvironmentPage() {
  const { projectId = "", envId = "" } = useParams()
  const navigate = useNavigate()
  const { data: env, isError } = useEnvironment(envId)
  const { data: apps, isLoading } = useApplications(envId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const del = useDeleteEnvironment(projectId)

  useEffect(() => {
    if (isError) navigate(`/projects/${projectId}`, { replace: true })
  }, [isError, navigate, projectId])

  const appLink = (appId: string) =>
    `/projects/${projectId}/environments/${envId}/applications/${appId}`

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
                {env?.projectName ?? "…"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{env?.name ?? "…"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            <span className="text-muted-foreground">{env?.projectName ?? "…"} / </span>
            {env?.name ?? "…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Bu environment'taki uygulamalar. Her biri bir Docker container.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={del.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Sil
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Uygulama ekle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-[130px] rounded-xl" />
            ))
          : apps?.map((a) => <ApplicationCard key={a.id} app={a} to={appLink(a.id)} />)}
        {!isLoading && <AddCard label="Uygulama ekle" onClick={() => setDialogOpen(true)} />}
      </div>

      <AddApplicationDialog envId={envId} open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Environment'ı sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{env?.name}</span> ve içindeki tüm uygulamalar (
              {env?.appCount ?? 0}) ile çalışan container'lar kalıcı olarak silinecek. Bu işlem geri
              alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                del.mutate(envId, {
                  onSuccess: () => {
                    toast.success("Environment silindi")
                    navigate(`/projects/${projectId}`, { replace: true })
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
