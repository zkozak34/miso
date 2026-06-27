import type { LucideIcon } from "lucide-react"
import { Boxes, FolderGit2, LayoutDashboard } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projeler", icon: FolderGit2 },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="font-semibold tracking-tight">Miso</p>
        <p className="text-xs text-muted-foreground">Docker Paneli</p>
      </div>
    </div>
  )
}

function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return (
    <nav className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "flex-row")}>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-background/60 px-3 py-4 md:flex">
        <div className="px-1">
          <Brand />
        </div>
        <div className="mt-6 flex-1">
          <NavLinks orientation="vertical" />
        </div>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">Faz 2</span>
          <ModeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <ModeToggle />
      </header>
      <div className="overflow-x-auto border-b px-2 py-2 md:hidden">
        <NavLinks orientation="horizontal" />
      </div>

      {/* Content */}
      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
