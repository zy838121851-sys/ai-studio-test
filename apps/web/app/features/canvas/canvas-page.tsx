import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fitCanvasNodeSize, upsertCanvasNode, type CanvasNode } from "@ai-studio/canvas-engine";
import type { AiJobDto } from "@ai-studio/contracts";
import { ArrowLeft, CircleAlert, LoaderCircle } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import { ApiClientError, createAiJob, listAssets, updateProject, uploadReference } from "../../lib/api-client.js";
import { useModelsQuery } from "../home/home-api.js";
import {
  useCanvasConversationQuery,
  useCanvasJobQuery,
  useCanvasProjectQuery
} from "./canvas-api.js";
import { CanvasChatComposer, type ChatAttachment } from "./chat-composer.js";
import { CanvasConversationHistory } from "./conversation-history.js";
import { ImageEditDialog } from "./image-edit-dialog.js";
import type { CanvasImageReference } from "./canvas-reference.js";
import { useCanvasReceiverStore } from "./canvas-store.js";
import { CanvasAdapter } from "./canvas-adapter.js";
import type { ImageToolbarCommand } from "./image-toolbar.js";
import { CanvasToolRail } from "./tool-rail.js";

import "./canvas.css";

export function CanvasPage() {
  const [activeTool, setActiveTool] = useState("select");
  const [canvasReferences, setCanvasReferences] = useState<CanvasImageReference[]>([]);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { projectId = "" } = useParams();
  const [searchParameters] = useSearchParams();
  const requestedJobId = searchParameters.get("jobId") ?? "";
  const projectQuery = useCanvasProjectQuery(projectId);
  const modelsQuery = useModelsQuery();
  const conversationQuery = useCanvasConversationQuery(projectId);
  const hydrate = useCanvasReceiverStore((state) => state.hydrate);
  const clear = useCanvasReceiverStore((state) => state.clear);
  const storedDocument = useCanvasReceiverStore((state) => state.document);
  const document = storedDocument?.projectId === projectId ? storedDocument : null;
  const pendingJobId = useMemo(
    () =>
      projectQuery.data?.canvasDocument.nodes.find((node) => node.kind === "pending-image")
        ?.jobId ?? "",
    [projectQuery.data]
  );
  const activeJobId = requestedJobId || pendingJobId;
  const jobQuery = useCanvasJobQuery(activeJobId);
  const refreshedTerminalJob = useRef("");
  const chatGenerationMutation = useMutation({
    mutationFn: async (input: {
      prompt: string;
      modelId: string;
      attachments: ChatAttachment[];
    }) => {
      const uploaded = await Promise.all(
        input.attachments.map(async (attachment) =>
          uploadReference(
            attachment.kind === "upload" ? attachment.file : await canvasReferenceFile(attachment)
          )
        )
      );
      return createAiJob({
        projectId,
        modelId: input.modelId,
        prompt: input.prompt,
        uploadIds: uploaded.map((item) => item.id),
        idempotencyKey: crypto.randomUUID()
      });
    },
    onSuccess: () => {
      void projectQuery.refetch();
      void conversationQuery.refetch();
    }
  });
  const assetsQuery = useQuery({ queryKey: ["assets"], queryFn: listAssets });
  const insertAssetMutation = useMutation({
    mutationFn: async (asset: { uploadId: string; url: string; name: string }) => {
      if (!document || !projectQuery.data) throw new Error("Project document is unavailable.");
      const next = upsertCanvasNode(document, {
        id: crypto.randomUUID(), kind: "image", sourceUrl: asset.url, alt: asset.name,
        x: 180 + (document.nodes.length % 5) * 32, y: 140 + (document.nodes.length % 5) * 32,
        width: 480, height: 480
      });
      const saved = await updateProject(projectId, { expectedVersion: projectQuery.data.version, canvasDocument: next });
      return saved.canvasDocument;
    },
    onSuccess: (canvasDocument) => { hydrate(canvasDocument, projectId); void projectQuery.refetch(); }
  });
  const submitImageCommand = async (command: ImageToolbarCommand) => {
    if (command.action === "edit-text") {
      setEditNodeId(command.nodeId);
      return;
    }
    if (command.action === "generate-3d") {
      return;
    }
    const transformKind =
      command.action === "upscale"
        ? "upscale"
        : command.action === "remove-background"
          ? "remove-background"
          : command.action === "expand"
            ? "expand"
            : command.action === "crop"
              ? "crop"
              : null;
    if (!transformKind) return;
    await createAiJob({
      projectId,
      modelId: "gpt-image-2",
      prompt: `Apply ${transformKind} to the selected image.`,
      uploadIds: [],
      idempotencyKey: crypto.randomUUID(),
      transformSourceNodeId: command.nodeId,
      transformKind
    });
    await projectQuery.refetch();
  };
  const submitImageEdit = async (prompt: string) => {
    if (!editNodeId) return;
    setIsEditing(true);
    try {
      await createAiJob({
        projectId,
        modelId: "gpt-image-2",
        prompt,
        uploadIds: [],
        idempotencyKey: crypto.randomUUID(),
        transformSourceNodeId: editNodeId,
        transformKind: "edit-text"
      });
      setEditNodeId(null);
      await Promise.all([projectQuery.refetch(), conversationQuery.refetch()]);
    } finally {
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (projectQuery.data) hydrate(projectQuery.data.canvasDocument, projectId);
  }, [hydrate, projectId, projectQuery.data]);

  useEffect(() => () => clear(), [clear]);

  useEffect(() => {
    const job = jobQuery.data;
    if (!job || (job.status !== "succeeded" && job.status !== "failed")) return;
    const terminalVersion = `${job.id}:${job.status}:${job.updatedAt}`;
    if (refreshedTerminalJob.current === terminalVersion) return;
    refreshedTerminalJob.current = terminalVersion;
    void projectQuery.refetch();
  }, [jobQuery.data, projectQuery]);

  if (!projectId) {
    return <CanvasFailure title="项目地址无效" message="缺少项目标识，请从首页重新打开。" />;
  }

  if (projectQuery.isLoading) {
    return <CanvasLoading />;
  }

  if (projectQuery.error || !projectQuery.data) {
    return (
      <CanvasFailure
        title="无法打开项目"
        message={errorMessage(projectQuery.error)}
        onRetry={() => void projectQuery.refetch()}
      />
    );
  }

  const job = jobQuery.data;

  return (
    <main className="canvas-receiver">
      <CanvasToolRail onToolChange={setActiveTool} />
      <header className="canvas-receiver__header">
        <Link className="canvas-receiver__brand" to="/" aria-label="返回 AI Studio 首页">
          D
        </Link>
        <div className="canvas-receiver__title">
          <h1>{projectQuery.data.title}</h1>
          <span>{jobStatusLabel(job, document?.nodes ?? [])}</span>
        </div>
        <Link className="canvas-receiver__back" to="/" title="返回首页">
          <ArrowLeft className="ui-icon" size={18} strokeWidth={2} aria-hidden="true" />
          <span>首页</span>
        </Link>
      </header>

      <section className="canvas-receiver__surface" aria-label="项目画布">
        <div className="canvas-receiver__document">
          {document ? (
            <CanvasAdapter
              document={document}
              job={job}
              activeTool={activeTool}
              onImageCommand={(command) => void submitImageCommand(command)}
              onImageReferencesChange={setCanvasReferences}
            />
          ) : null}
          {document && document.nodes.length === 0 ? (
            <p className="canvas-receiver__empty">空白画布</p>
          ) : null}
        </div>
      </section>
      <aside className="canvas-chat-panel" aria-label="Canvas chat">
        <CanvasConversationHistory conversation={conversationQuery.data} />
        <CanvasChatComposer
          models={modelsQuery.data ?? []}
          submitting={chatGenerationMutation.isPending}
          canvasReferences={canvasReferences}
          onSubmit={(input) => chatGenerationMutation.mutateAsync(input).then(() => undefined)}
        />
      </aside>
      <aside className="canvas-asset-panel" aria-label="Project assets">
        {assetsQuery.data?.map((asset) => <button key={asset.id} type="button" title={`Insert ${asset.name}`} onClick={() => insertAssetMutation.mutate(asset)}><img src={asset.url} alt={asset.name}/></button>)}
      </aside>
      <ImageEditDialog
        open={Boolean(editNodeId)}
        submitting={isEditing}
        onClose={() => setEditNodeId(null)}
        onSubmit={submitImageEdit}
      />
    </main>
  );
}

async function canvasReferenceFile(attachment: Extract<ChatAttachment, { kind: "canvas" }>) {
  const response = await fetch(attachment.sourceUrl, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to read the selected canvas image.");
  const blob = await response.blob();
  return new File([blob], attachment.name || "canvas-reference", {
    type: blob.type || "image/png"
  });
}

// Kept as the legacy-compatible renderer reference while the adapter rolls out.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CanvasNodeView({ node, job }: { node: CanvasNode; job: AiJobDto | undefined }) {
  const fitted = fitCanvasNodeSize(node.width, node.height);
  const style = {
    left: node.x,
    top: node.y,
    width: fitted.width,
    height: fitted.height
  };

  if (node.kind === "image") {
    return (
      <figure className="canvas-result-node" style={style} data-node-kind="image">
        <img src={node.sourceUrl} alt={node.alt} />
      </figure>
    );
  }

  if (node.kind !== "pending-image") return null;
  const failed = job?.id === node.jobId && job.status === "failed";
  return (
    <article
      className={`canvas-pending-node${failed ? " is-failed" : ""}`}
      style={style}
      data-node-kind="pending-image"
    >
      {failed ? (
        <CircleAlert
          className="canvas-pending-node__indicator is-failed"
          size={20}
          strokeWidth={2}
          aria-hidden="true"
        />
      ) : (
        <LoaderCircle
          className="canvas-pending-node__indicator is-spinning"
          size={20}
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
      <strong>{failed ? "生成失败" : "正在生成图片"}</strong>
      <p>{failed ? (job.error?.message ?? "任务未完成，请返回首页重试。") : jobDetail(job)}</p>
    </article>
  );
}

function CanvasLoading() {
  return (
    <main className="canvas-receiver canvas-receiver--loading" aria-busy="true">
      <div className="canvas-loading-mark">D</div>
      <p>正在打开项目</p>
    </main>
  );
}

function CanvasFailure({
  title,
  message,
  onRetry
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <main className="canvas-receiver canvas-receiver--failure" role="alert">
      <h1>{title}</h1>
      <p>{message}</p>
      <div>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            重试
          </button>
        ) : null}
        <Link to="/">返回首页</Link>
      </div>
    </main>
  );
}

function jobStatusLabel(job: AiJobDto | undefined, nodes: CanvasNode[]): string {
  if (job?.status === "failed") return "生成失败，积分已释放";
  if (job?.status === "queued") return "任务排队中";
  if (job?.status === "running") return "正在生成";
  if (job?.status === "succeeded" || nodes.some((node) => node.kind === "image")) {
    return "项目已保存";
  }
  if (nodes.some((node) => node.kind === "pending-image")) return "等待任务状态";
  return "项目已保存";
}

function jobDetail(job: AiJobDto | undefined): string {
  if (!job) return "正在读取任务状态...";
  return job.status === "queued" ? "任务已进入生成队列" : "生成结果会自动保存到项目";
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 401) return "请先登录后再打开项目。";
  return error instanceof ApiClientError ? error.message : "项目加载失败，请稍后重试。";
}
