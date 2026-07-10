import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HomeRoute from "./home.js";

describe("HomeRoute", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "attachment-id") });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:attachment-preview"),
      revokeObjectURL: vi.fn()
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/auth/me")) {
          return Response.json(
            { error: { code: "UNAUTHORIZED", message: "请先登录", requestId: "test" } },
            { status: 401 }
          );
        }
        if (url.includes("/models")) {
          return Response.json([
            {
              id: "gpt-image-2",
              label: "GPT Image 2",
              modality: "image",
              group: "图像模型",
              description: "高质量图像模型",
              capabilities: ["文生图"],
              creditCost: 8,
              estimatedSeconds: 45,
              outputCount: 1,
              isDefault: true,
              enabled: true
            },
            {
              id: "nano-banana-pro",
              label: "Nano Banana Pro",
              modality: "image",
              group: "图像模型",
              description: "高质量海外图像模型",
              capabilities: ["文生图", "图生图"],
              creditCost: 10,
              estimatedSeconds: 45,
              outputCount: 1,
              isDefault: false,
              enabled: true
            }
          ]);
        }
        return Response.json({ items: [], nextCursor: null });
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the creation entry and switches the selected model quote", async () => {
    const user = userEvent.setup();
    renderRoute();

    expect(screen.getByRole("heading", { name: "今天做点什么？" })).toBeVisible();
    const modelButton = await screen.findByRole("button", { name: /GPT Image 2/ });
    await user.click(modelButton);

    const dialog = screen.getByRole("dialog", { name: "模型偏好" });
    expect(dialog).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: /Nano Banana Pro/ }));

    expect(screen.getByRole("button", { name: /Nano Banana Pro/ })).toBeVisible();
    expect(screen.getByTitle("开始生成")).toHaveTextContent("10");
  });

  it("previews and removes a reference attachment", async () => {
    const user = userEvent.setup();
    renderRoute();
    const file = new File(["image"], "reference.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("添加参考图片"), file);
    expect(screen.getByRole("img", { name: "reference.png" })).toHaveAttribute(
      "src",
      "blob:attachment-preview"
    );

    await user.click(screen.getByTitle("移除参考图"));
    expect(screen.queryByRole("img", { name: "reference.png" })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:attachment-preview");
  });

  it("opens authentication instead of creating a signed-out generation", async () => {
    const user = userEvent.setup();
    renderRoute();

    await user.type(screen.getByRole("textbox", { name: "创作描述" }), "生成一个产品效果图");
    await user.click(screen.getByTitle("开始生成"));

    expect(await screen.findByRole("dialog", { name: "登录 AI Studio" })).toBeVisible();
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/v1/projects",
      expect.objectContaining({ method: "POST" })
    );
  });
});

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <HomeRoute />
      </QueryClientProvider>
    </MemoryRouter>
  );
}
