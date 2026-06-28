import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComingSoon } from "./add-application/coming-soon"
import { GitApplicationForm } from "./add-application/git-form"
import { TemplateForm } from "./add-application/template-form"

export function AddApplicationDialog({
  envId,
  open,
  onOpenChange,
}: {
  envId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState("git")
  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-140">
        <DialogHeader>
          <DialogTitle>Uygulama ekle</DialogTitle>
          <DialogDescription>Bu environment'a yeni bir Docker container dağıt.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="git">Git</TabsTrigger>
            <TabsTrigger value="docker">Docker</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="git" className="mt-4">
            <GitApplicationForm envId={envId} onClose={close} />
          </TabsContent>
          <TabsContent value="docker" className="mt-4">
            <ComingSoon label="Docker image ile dağıtım" />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <TemplateForm envId={envId} onClose={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
