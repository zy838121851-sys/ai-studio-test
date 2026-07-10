import { useQuery } from "@tanstack/react-query";

import { getAiJob, getProject } from "../../lib/api-client.js";

export const canvasQueryKeys = {
  project: (projectId: string) => ["projects", "detail", projectId] as const,
  job: (jobId: string) => ["ai-jobs", jobId] as const
};

export function useCanvasProjectQuery(projectId: string) {
  return useQuery({
    queryKey: canvasQueryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId)
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
