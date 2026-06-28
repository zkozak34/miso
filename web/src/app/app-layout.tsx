import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"
import { HostHealthChip } from "./host-health-chip"
import { SidebarLogo } from "./sidebar-logo"
import { SidebarNav } from "./sidebar-nav"

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("miso.sidebar-collapsed") === "1",
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem("miso.sidebar-collapsed", collapsed ? "1" : "0")
  }, [collapsed])

  const sidebarWidth = collapsed ? "w-15.5" : "w-58"
  const mainPad = collapsed ? "md:pl-15.5" : "md:pl-58"

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-surface-2 transition-[width] duration-200 md:flex",
          sidebarWidth,
        )}
      >
        <div className="flex h-14 flex-none items-center border-b px-4">
          <SidebarLogo showText={!collapsed} />
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="flex-none border-t p-2.5">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "flex h-8.5 w-full items-center gap-3 rounded-lg px-3 text-[12.5px] text-text-tertiary transition-colors hover:bg-accent hover:text-muted-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5 flex-none" />
            ) : (
              <>
                <PanelLeftClose className="h-4.5 w-4.5 flex-none" />
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
            className="absolute inset-0 bg-(--scrim)"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-full w-65.5 flex-col border-r bg-surface-2">
            <div className="flex h-14 flex-none items-center justify-between border-b px-4">
              <SidebarLogo showText />
              <button
                type="button"
                aria-label="Kapat"
                onClick={() => setDrawerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-(--topbar) px-4 backdrop-blur-md",
          mainPad,
        )}
      >
        <button
          type="button"
          aria-label="Menü"
          onClick={() => setDrawerOpen(true)}
          className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-[7px] text-muted-foreground hover:bg-accent md:hidden"
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
