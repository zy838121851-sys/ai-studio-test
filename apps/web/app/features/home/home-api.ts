import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getCurrentSession,
  getHomeFeed,
  listModels,
  listRecentProjects
} from "../../lib/api-client.js";

export const homeQueryKeys = {
  session: ["session"] as const,
  models: ["models"] as const,
  projects: ["projects", "recent"] as const,
  feed: (channel: string) => ["home-feed", channel] as const
};

export function useSessionQuery() {
  return useQuery({
    queryKey: homeQueryKeys.session,
    queryFn: getCurrentSession,
    staleTime: 30_000
  });
}

export function useModelsQuery() {
  return useQuery({ queryKey: homeQueryKeys.models, queryFn: listModels, staleTime: 5 * 60_000 });
}

export function useRecentProjectsQuery(enabled: boolean) {
  return useQuery({
    queryKey: homeQueryKeys.projects,
    queryFn: () => listRecentProjects(12),
    enabled
  });
}

export function useHomeFeedQuery(channel: string) {
  return useInfiniteQuery({
    queryKey: homeQueryKeys.feed(channel),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => getHomeFeed({ channel, cursor: pageParam, limit: 12 }),
    getNextPageParam: (page) => page.nextCursor
  });
}
