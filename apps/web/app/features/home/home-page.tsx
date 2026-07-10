import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import {
  ApiClientError,
  createAiJob,
  createProject,
  logout,
  uploadReference
} from "../../lib/api-client.js";
import { AuthDialog } from "./components/auth-dialog.js";
import { HomeComposer, type HomeAttachment } from "./components/home-composer.js";
import { HomeHeader, HomeSideRail } from "./components/home-header.js";
import { InspirationFeed } from "./components/inspiration-feed.js";
import { RecentProjects } from "./components/recent-projects.js";
import {
  homeQueryKeys,
  useHomeFeedQuery,
  useModelsQuery,
  useRecentProjectsQuery,
  useSessionQuery
} from "./home-api.js";

import "./home.css";

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useSessionQuery();
  const modelsQuery = useModelsQuery();
  const recentProjectsQuery = useRecentProjectsQuery(Boolean(sessionQuery.data));
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<HomeAttachment[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("gpt-image-2");
  const [channel, setChannel] = useState("推荐");
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [backToTopVisible, setBackToTopVisible] = useState(false);
  const feedQuery = useHomeFeedQuery(channel);

  const models = modelsQuery.data ?? [];
  useEffect(() => {
    if (models.length > 0 && !models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(
        models.find((model) => model.modality === "image")?.id ?? models[0]?.id ?? ""
      );
    }
  }, [models, selectedModelId]);

  useEffect(() => {
    const update = () => setBackToTopVisible(window.scrollY > 600);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const generationMutation = useMutation({
    mutationFn: async () => {
      if (!sessionQuery.data) {
        throw new ApiClientError(401, "UNAUTHORIZED", "请先登录");
      }
      const uploaded = await Promise.all(
        attachments.map((attachment) => uploadReference(attachment.file))
      );
      const cleanPrompt = prompt.trim();
      const project = await createProject({
        title: cleanPrompt.slice(0, 32) || "未命名项目",
        prompt: cleanPrompt
      });
      const job = await createAiJob({
        projectId: project.id,
        modelId: selectedModelId,
        prompt: cleanPrompt,
        uploadIds: uploaded.map((item) => item.id),
        idempotencyKey: crypto.randomUUID()
      });
      return { project, job };
    },
    onSuccess: ({ project, job }) => {
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: homeQueryKeys.session });
      navigate(`/canvas/${project.id}?jobId=${job.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 401) setAuthOpen(true);
      setNotice(errorMessage(error));
    }
  });

  const newProjectMutation = useMutation({
    mutationFn: () => createProject({ title: "未命名项目", prompt: "" }),
    onSuccess: (project) => navigate(`/canvas/${project.id}`),
    onError: (error) => setNotice(errorMessage(error))
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(homeQueryKeys.session, null);
      queryClient.removeQueries({ queryKey: homeQueryKeys.projects });
    },
    onError: (error) => setNotice(errorMessage(error))
  });

  const feedItems = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [feedQuery.data]
  );
  const loadMore = useCallback(() => {
    if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
      void feedQuery.fetchNextPage();
    }
  }, [feedQuery]);

  return (
    <div className="home-page">
      <HomeHeader
        session={sessionQuery.data}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={() => logoutMutation.mutate()}
      />
      <HomeSideRail />

      <main>
        <section className="create-area" id="create" aria-labelledby="create-title">
          <h1 id="create-title">今天做点什么？</h1>
          <HomeComposer
            prompt={prompt}
            onPromptChange={setPrompt}
            models={models}
            selectedModelId={selectedModelId}
            onModelChange={setSelectedModelId}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            submitting={generationMutation.isPending}
            onSubmit={() => {
              setNotice("");
              generationMutation.mutate();
            }}
          />
        </section>

        <RecentProjects
          projects={recentProjectsQuery.data ?? []}
          signedIn={Boolean(sessionQuery.data)}
          loading={recentProjectsQuery.isLoading}
          onCreate={() => newProjectMutation.mutate()}
          onOpen={(projectId) => navigate(`/canvas/${projectId}`)}
          onRequireAuth={() => setAuthOpen(true)}
        />

        <InspirationFeed
          channel={channel}
          onChannelChange={setChannel}
          items={feedItems}
          loading={feedQuery.isLoading}
          fetchingMore={feedQuery.isFetchingNextPage}
          onLoadMore={loadMore}
        />
      </main>

      {notice ? (
        <div className="home-toast" role="status">
          <span>{notice}</span>
          <button type="button" title="关闭" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      ) : null}

      <button
        className={`back-to-top${backToTopVisible ? " is-visible" : ""}`}
        type="button"
        title="回到顶部"
        aria-hidden={!backToTopVisible}
        tabIndex={backToTopVisible ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof ApiClientError ? error.message : "请求失败，请稍后重试";
}
