import type { LucideIcon } from "lucide-react"
import { FolderGit2, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react"
import { useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import { useSystemInfo } from "@/lib/queries"
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

function Logo({ showText }: { showText: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-[7px] bg-gradient-to-br from-[#fb923c] to-[#e0651f] font-mono text-[15px] font-bold text-[#08080a]">
        M
      </div>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">Miso</span>
      )}
    </div>
  )
}

function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={label}
          className={({ isActive }) =>
            cn(
              "relative flex h-[38px] items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-accent font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute -left-2.5 top-2 bottom-2 w-[2.5px] rounded-full bg-primary" />
              )}
              <Icon className="h-[18px] w-[18px] flex-none" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function HostHealthChip() {
  const { data } = useSystemInfo()
  const host = data?.hostname ?? "node"
  return (
    <div className="flex h-[30px] items-center gap-2 rounded-[7px] border bg-card px-2.5">
      <span className="relative flex h-[7px] w-[7px] flex-none">
        <span className="absolute inset-0 rounded-full bg-emerald-400" />
        <span
          className="absolute inset-0 rounded-full bg-emerald-400"
          style={{ animation: "ringPulse 2.4s ease-out infinite" }}
        />
      </span>
      <span className="font-mono text-xs text-muted-foreground">{host}</span>
      <span className="text-[11.5px] font-medium text-emerald-400">Healthy</span>
    </div>
  )
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("miso.sidebar-collapsed") === "1",
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem("miso.sidebar-collapsed", collapsed ? "1" : "0")
  }, [collapsed])

  const sidebarWidth = collapsed ? "w-[62px]" : "w-[232px]"
  const mainPad = collapsed ? "md:pl-[62px]" : "md:pl-[232px]"

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-surface-2 transition-[width] duration-200 md:flex",
          sidebarWidth,
        )}
      >
        <div className="flex h-14 flex-none items-center border-b px-4">
          <Logo showText={!collapsed} />
        </div>
        <NavItems collapsed={collapsed} />
        <div className="flex-none border-t p-2.5">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-[34px] w-full items-center gap-3 rounded-lg px-3 text-[12.5px] text-text-tertiary transition-colors hover:bg-accent hover:text-muted-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px] flex-none" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px] flex-none" />
                <span className="whitespace-nowrap">Daralt</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            className="absolute inset-0 bg-[var(--scrim)]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-[262px] flex-col border-r bg-surface-2">
            <div className="flex h-14 flex-none items-center justify-between border-b px-4">
              <Logo showText />
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavItems collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-[var(--topbar)] px-4 backdrop-blur-md",
          mainPad,
        )}
      >
        <button
          type="button"
          aria-label="Menü"
          onClick={() => setDrawerOpen(true)}
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[7px] text-muted-foreground hover:bg-accent md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <HostHealthChip />
          <ModeToggle />
        </div>
      </header>

      <main className={mainPad}>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
