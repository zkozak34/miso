export type ResourceStatus = "running" | "building" | "failed" | "stopped"

export interface Project {
  id: string
  name: string
  description: string
  environmentCount: number
  appCount: number
  status: ResourceStatus
  createdAt: number
  updatedAt: number
}

export interface Environment {
  id: string
  projectId: string
  projectName: string
  name: string
  appCount: number
  status: ResourceStatus
  createdAt: number
  updatedAt: number
}

export type AppSource = "git" | "docker" | "template"

export type RestartPolicy = "no" | "on-failure" | "unless-stopped" | "always"

export interface Application {
  id: string
  environmentId: string
  name: string
  sourceType: AppSource
  repoUrl: string
  branch: string
  dockerfilePath: string
  buildArgs: Record<string, string>
  hasAuthToken: boolean
  image: string
  hostPort: number | null
  containerPort: number | null
  restartPolicy: RestartPolicy
  lastError?: string
  status: ResourceStatus
  projectId?: string
  projectName?: string
  environmentName?: string
  containerName?: string
  createdAt: number
  updatedAt: number
}

export interface CreateApplicationInput {
  name: string
  sourceType: AppSource
  repoUrl: string
  branch: string
  dockerfilePath: string
  buildArgs: Record<string, string>
  authToken: string
  image?: string
  hostPort?: number | null
  containerPort?: number | null
}

export interface UpdateApplicationInput {
  hostPort: number | null
  containerPort: number | null
  restartPolicy: RestartPolicy
}

export interface AppStats {
  cpuPercent: number
  memoryUsage: number
  memoryLimit: number
  netRxBytes: number
  netTxBytes: number
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {}
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const listProjects = () => request<Project[]>("/api/projects")
export const getProject = (id: string) => request<Project>(`/api/projects/${id}`)
export const createProject = (input: { name: string; description?: string }) =>
  request<Project>("/api/projects", { method: "POST", body: JSON.stringify(input) })
export const deleteProject = (id: string) =>
  request<void>(`/api/projects/${id}`, { method: "DELETE" })

export const listEnvironments = (projectId: string) =>
  request<Environment[]>(`/api/projects/${projectId}/environments`)
export const getEnvironment = (id: string) => request<Environment>(`/api/environments/${id}`)
export const createEnvironment = (projectId: string, name: string) =>
  request<Environment>(`/api/projects/${projectId}/environments`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
export const deleteEnvironment = (id: string) =>
  request<void>(`/api/environments/${id}`, { method: "DELETE" })

export const listApplications = (envId: string) =>
  request<Application[]>(`/api/environments/${envId}/applications`)
export const getApplication = (id: string) => request<Application>(`/api/applications/${id}`)
export const createApplication = (envId: string, input: CreateApplicationInput) =>
  request<Application>(`/api/environments/${envId}/applications`, {
    method: "POST",
    body: JSON.stringify(input),
  })
export const updateApplication = (id: string, input: UpdateApplicationInput) =>
  request<Application>(`/api/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
export const deleteApplication = (id: string) =>
  request<void>(`/api/applications/${id}`, { method: "DELETE" })
export const applicationAction = (id: string, action: "deploy" | "stop" | "restart") =>
  request<Application>(`/api/applications/${id}/${action}`, { method: "POST" })
export const getApplicationStats = (id: string) =>
  request<AppStats>(`/api/applications/${id}/stats`)
export const getApplicationLogs = (id: string) =>
  request<{ logs: string }>(`/api/applications/${id}/logs`)
