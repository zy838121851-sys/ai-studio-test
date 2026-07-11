import { useQuery } from "@tanstack/react-query";

import { getAiJob, getProject, getProjectConversation } from "../../lib/api-client.js";

export const canvasQueryKeys = {
  project: (projectId: string) => ["projects", "detail", projectId] as const,
  job: (jobId: string) => ["ai-jobs", jobId] as const,
  conversation: (projectId: string) => ["conversations", projectId] as const
};

export function useCanvasProjectQuery(projectId: string) {
  return useQuery({
    queryKey: canvasQueryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId)
  });
}

export function useCanvasConversationQuery(projectId: string) {
  return useQuery({
    queryKey: canvasQueryKeys.conversation(projectId),
    queryFn: () => getProjectConversation(projectId),
    enabled: Boolean(projectId),
    refetchInterval: (query) =>
      query.state.data?.messages.some(
        (message) => message.status === "queued" || message.status === "running"
      )
        ? 2_000
        : false
  });
}

export function useCanvasJobQuery(jobId: string) {
  return useQuery({
    queryKey: canvasQueryKeys.job(jobId),
    queryFn: () => getAiJob(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" ? 2_000 : false;
    }
  });
}
