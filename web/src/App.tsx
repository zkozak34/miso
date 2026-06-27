import { Boxes } from "lucide-react"
import { Dashboard } from "@/components/dashboard/dashboard"
import { ModeToggle } from "@/components/mode-toggle"
import { SettingsDialog } from "@/components/settings-dialog"
import { SettingsProvider } from "@/components/settings-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import { useMetricsStream } from "@/hooks/use-metrics-stream"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: ReturnType<typeof useMetricsStream>["status"] }) {
  const map = {
    open: { label: "Canlı", dot: "bg-emerald-500" },
    connecting: { label: "Bağlanıyor", dot: "bg-amber-500" },
    closed: { label: "Kesildi", dot: "bg-red-500" },
  } as const
  const { label, dot } = map[status]
  return (
    <Badge variant="outline" className="gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot, status === "open" && "animate-pulse")} />
      {label}
    </Badge>
  )
}

function AppShell() {
  const { latest, history, status } = useMetricsStream()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-semibold tracking-tight">Miso</h1>
              <p className="text-xs text-muted-foreground">Docker Yönetim Paneli</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            <SettingsDialog />
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Dashboard latest={latest} history={history} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <AppShell />
        <Toaster richColors position="top-right" />
      </SettingsProvider>
    </ThemeProvider>
  )
}
