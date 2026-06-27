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
import { AddCard } from "@/features/projects/add-card"
import { EnvironmentCard } from "@/features/projects/environment-card"
import { NewEnvironmentDialog } from "@/features/projects/new-environment-dialog"
import { useDeleteProject, useEnvironments, useProject } from "@/lib/queries"

export function ProjectPage() {
  const { projectId = "" } = useParams()
  const navigate = useNavigate()
  const { data: project, isError } = useProject(projectId)
  const { data: environments, isLoading } = useEnvironments(projectId)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const del = useDeleteProject()

  useEffect(() => {
    if (isError) navigate("/projects", { replace: true })
  }, [isError, navigate])

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
            <BreadcrumbPage className="font-mono">{project?.name ?? "…"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            {project?.name ?? "…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project
              ? `${project.environmentCount} environment · ${project.appCount} uygulama`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Sil
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Yeni environment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-26 rounded-xl" />
            ))
          : environments?.map((e) => <EnvironmentCard key={e.id} environment={e} />)}
        {!isLoading && <AddCard label="Yeni environment" onClick={() => setDialogOpen(true)} />}
      </div>

      <NewEnvironmentDialog projectId={projectId} open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projeyi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{project?.name}</span> ve içindeki tüm environment'lar (
              {project?.environmentCount ?? 0}) ile uygulamalar ({project?.appCount ?? 0}) kalıcı
              olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                del.mutate(projectId, {
                  onSuccess: () => {
                    toast.success("Proje silindi")
                    navigate("/projects", { replace: true })
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
