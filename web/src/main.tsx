import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/app/app-layout"
import { SettingsProvider } from "@/components/settings-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ApplicationPage } from "@/pages/application"
import { EnvironmentPage } from "@/pages/environment"
import { ProjectPage } from "@/pages/project"
import { ProjectsPage } from "@/pages/projects"
import { SystemDashboardPage } from "@/pages/system-dashboard"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false } },
})

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <SystemDashboardPage /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:projectId", element: <ProjectPage /> },
      { path: "projects/:projectId/environments/:envId", element: <EnvironmentPage /> },
      {
        path: "projects/:projectId/environments/:envId/applications/:appId",
        element: <ApplicationPage />,
      },
    ],
  },
])

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Root element #root not found")

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </SettingsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
