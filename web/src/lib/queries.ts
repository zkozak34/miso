import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchSystemInfo } from "@/lib/api"
import {
  applicationAction,
  type CreateApplicationInput,
  createApplication,
  createEnvironment,
  createProject,
  deleteApplication,
  deleteEnvironment,
  deleteProject,
  type EnvVar,
  getApplication,
  getApplicationLogs,
  getApplicationStats,
  getEnvironment,
  getProject,
  listApplications,
  listDeployments,
  listEnvironments,
  listProjects,
  listTemplates,
  type UpdateApplicationInput,
  updateApplication,
  updateApplicationEnv,
} from "@/lib/api/resources"

export const keys = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  environments: (projectId: string) => ["projects", projectId, "environments"] as const,
  environment: (id: string) => ["environments", id] as const,
  applications: (envId: string) => ["environments", envId, "applications"] as const,
  application: (id: string) => ["applications", id] as const,
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ["system-info"],
    queryFn: () => fetchSystemInfo(),
    staleTime: 60_000,
  })
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: listTemplates, staleTime: Infinity })
}

export function useProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: listProjects })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: keys.project(id),
    queryFn: () => getProject(id),
    enabled: !!id,
    retry: false,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: keys.project(id) })
      qc.removeQueries({ queryKey: keys.environments(id) })
      qc.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

export function useEnvironments(projectId: string) {
  return useQuery({
    queryKey: keys.environments(projectId),
    queryFn: () => listEnvironments(projectId),
    enabled: !!projectId,
  })
}

export function useEnvironment(id: string) {
  return useQuery({
    queryKey: keys.environment(id),
    queryFn: () => getEnvironment(id),
    enabled: !!id,
    retry: false,
  })
}

export function useCreateEnvironment(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createEnvironment(projectId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.environments(projectId) })
      qc.invalidateQueries({ queryKey: keys.project(projectId) })
      qc.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

export function useDeleteEnvironment(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteEnvironment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.environments(projectId) })
      qc.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

export function useApplications(envId: string) {
  return useQuery({
    queryKey: keys.applications(envId),
    queryFn: () => listApplications(envId),
    enabled: !!envId,
  })
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: keys.application(id),
    queryFn: () => getApplication(id),
    enabled: !!id,
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === "building" ? 2000 : false),
  })
}

export function useApplicationStats(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["applications", id, "stats"],
    queryFn: () => getApplicationStats(id),
    enabled: enabled && !!id,
    retry: false,
    refetchInterval: enabled ? 3000 : false,
  })
}

export function useApplicationLogs(id: string, poll: boolean) {
  return useQuery({
    queryKey: ["applications", id, "logs"],
    queryFn: () => getApplicationLogs(id),
    enabled: !!id,
    retry: false,
    refetchInterval: poll ? 3000 : false,
  })
}

export function useDeployments(id: string, poll: boolean) {
  return useQuery({
    queryKey: ["applications", id, "deployments"],
    queryFn: () => listDeployments(id),
    enabled: !!id,
    retry: false,
    refetchInterval: poll ? 2000 : false,
  })
}

export function useCreateApplication(envId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => createApplication(envId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.applications(envId) })
      qc.invalidateQueries({ queryKey: keys.environment(envId) })
    },
  })
}

export function useDeleteApplication(envId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.applications(envId) })
      qc.invalidateQueries({ queryKey: keys.environment(envId) })
    },
  })
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateApplicationInput) => updateApplication(id, input),
    onSuccess: (app) => {
      qc.setQueryData(keys.application(id), app)
      qc.invalidateQueries({ queryKey: keys.applications(app.environmentId) })
    },
  })
}

export function useUpdateApplicationEnv(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (envVars: EnvVar[]) => updateApplicationEnv(id, envVars),
    onSuccess: (app) => {
      qc.setQueryData(keys.application(id), app)
      qc.invalidateQueries({ queryKey: keys.applications(app.environmentId) })
    },
  })
}

export function useApplicationAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: "deploy" | "stop" | "restart") => applicationAction(id, action),
    onSuccess: (app) => {
      qc.setQueryData(keys.application(id), app)
      qc.invalidateQueries({ queryKey: keys.applications(app.environmentId) })
    },
  })
}
