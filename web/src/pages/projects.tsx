import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AddCard } from "@/features/projects/add-card"
import { NewProjectDialog } from "@/features/projects/new-project-dialog"
import { ProjectCard } from "@/features/projects/project-card"
import { useProjects } from "@/lib/queries"

export function ProjectsPage() {
  const { data: projects, isLoading, isError, error } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projeler</h1>
          <p className="text-sm text-muted-foreground">
            Uygulamalarını projelere göre grupla, her birini environment'lara böl.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Yeni proje
        </Button>
      </div>

      {isError && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-xl" />
            ))
          : projects?.map((p) => <ProjectCard key={p.id} project={p} />)}
        {!isLoading && <AddCard label="Yeni proje" onClick={() => setDialogOpen(true)} />}
      </div>

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
