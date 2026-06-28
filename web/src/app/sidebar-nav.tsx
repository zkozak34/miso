import type { LucideIcon } from "lucide-react"
import { FolderGit2, LayoutDashboard } from "lucide-react"
import { NavLink } from "react-router-dom"
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

export function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
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
              "relative flex h-9.5 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors",
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
              <Icon className="h-4.5 w-4.5 flex-none" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
