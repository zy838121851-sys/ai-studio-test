import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCanvasReceiverStore } from "../features/canvas/canvas-store.js";
import CanvasRoute from "./canvas.js";

const PROJECT_BASE = {
  id: "project-1",
  title: "Fresh Ideas",
  prompt: "生成产品效果图",
  thumbnailUrl: null,
  version: 2,
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:01:00.000Z"
};

describe("CanvasRoute", () => {
  afterEach(() => {
    cleanup();
    useCanvasReceiverStore.getState().clear();
    vi.unstubAllGlobals();
  });

  it("restores a pending node and reads the durable job state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/projects/project-1")) {
          return Response.json({
            ...PROJECT_BASE,
            canvasDocument: {
              schemaVersion: 1,
              projectId: "project-1",
              nodes: [
                {
                  id: "pending-job-1",
                  kind: "pending-image",
                  jobId: "job-1",
                  x: 120,
                  y: 100,
                  width: 640,
                  height: 640
                }
              ]
            }
          });
        }
        if (url.includes("/api/v1/ai-jobs/job-1")) {
          return Response.json({
            id: "job-1",
            projectId: "project-1",
            modelId: "gpt-image-2",
            status: "running",
            prompt: "生成产品效果图",
            reservedCredits: 8,
            chargedCredits: 0,
            output: null,
            error: null,
            createdAt: "2026-07-10T00:00:00.000Z",
            updatedAt: "2026-07-10T00:01:00.000Z"
          });
        }
        return Response.json(
          { error: { code: "NOT_FOUND", message: "not found" } },
          { status: 404 }
        );
      })
    );

    renderRoute("/canvas/project-1?jobId=job-1");

    expect(await screen.findByRole("heading", { name: "Fresh Ideas" })).toBeVisible();
    expect(await screen.findByText("正在生成图片")).toBeVisible();
    expect(screen.getByText("正在生成")).toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/ai-jobs/job-1",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("restores a completed image from the versioned canvas document", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/projects/project-1")) {
          return Response.json({
            ...PROJECT_BASE,
            version: 3,
            thumbnailUrl: "/api/v1/uploads/upload-1/content",
            canvasDocument: {
              schemaVersion: 1,
              projectId: "project-1",
              nodes: [
                {
                  id: "result-job-1",
                  kind: "image",
                  sourceUrl: "/api/v1/uploads/upload-1/content",
                  alt: "生成图片",
                  x: 120,
                  y: 100,
                  width: 800,
                  height: 1000
                }
              ]
            }
          });
        }
        return Response.json(
          { error: { code: "NOT_FOUND", message: "not found" } },
          { status: 404 }
        );
      })
    );

    renderRoute("/canvas/project-1");

    const image = await screen.findByRole("img", { name: "生成图片" });
    expect(image).toHaveAttribute("src", "/api/v1/uploads/upload-1/content");
    expect(image.closest("figure")).toHaveStyle({ width: "512px", height: "640px" });
    expect(screen.getByText("项目已保存")).toBeVisible();
  });
});

function renderRoute(entry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="canvas/:projectId" element={<CanvasRoute />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}
