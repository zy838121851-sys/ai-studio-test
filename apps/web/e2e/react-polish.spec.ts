import { expect, test, type Page, type Route } from "playwright/test";

const models = [
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    modality: "image",
    group: "图像模型",
    description: "高质量图像模型，适合复杂指令、参考图生成和图片编辑",
    capabilities: ["文生图", "图生图"],
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
    description: "高质量海外图像模型，适合精修和复杂画面生成",
    capabilities: ["文生图", "图生图"],
    creditCost: 10,
    estimatedSeconds: 45,
    outputCount: 1,
    isDefault: false,
    enabled: true
  },
  {
    id: "midjourney",
    label: "Midjourney",
    modality: "image",
    group: "图像模型",
    description: "风格化图像模型，一次任务默认生成四张候选图",
    capabilities: ["文生图"],
    creditCost: 12,
    estimatedSeconds: 60,
    outputCount: 4,
    isDefault: false,
    enabled: true
  },
  {
    id: "video-preview",
    label: "视频模型",
    modality: "video",
    group: "视频模型",
    description: "后续阶段开放",
    capabilities: ["文生视频"],
    creditCost: 20,
    estimatedSeconds: 90,
    outputCount: 1,
    isDefault: false,
    enabled: true
  },
  {
    id: "model-3d-preview",
    label: "3D 模型",
    modality: "3d",
    group: "3D 模型",
    description: "后续阶段开放",
    capabilities: ["图生 3D"],
    creditCost: 30,
    estimatedSeconds: 120,
    outputCount: 1,
    isDefault: false,
    enabled: true
  }
];

test("desktop home preserves menus and bounded polish", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockHome(page, true);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "今天做点什么？" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "工作区导航" })).toBeVisible();

  const modelTrigger = page.getByRole("button", { name: "GPT Image 2" });
  await expect(modelTrigger).toHaveCount(1);
  await modelTrigger.click();
  const modelPicker = page.getByRole("dialog", { name: "模型偏好" });
  await expect(modelPicker).toBeVisible();
  const pickerBox = await modelPicker.boundingBox();
  expect(pickerBox).not.toBeNull();
  expect((pickerBox?.x ?? 0) + (pickerBox?.width ?? 0)).toBeLessThanOrEqual(1440);
  expect((pickerBox?.y ?? 0) + (pickerBox?.height ?? 0)).toBeLessThanOrEqual(1000);
  await page.waitForTimeout(260);
  await page.screenshot({ path: testInfo.outputPath("home-model-menu-desktop.png") });

  const accountTrigger = page.getByRole("button", { name: "账户菜单" });
  await expect(accountTrigger).toHaveCount(1);
  await accountTrigger.click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.waitForTimeout(260);
  await page.screenshot({ path: testInfo.outputPath("home-account-menu-desktop.png") });
});

test("mobile home keeps 44px controls and stable layout", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockHome(page, false);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "今天做点什么？" })).toBeVisible();
  for (const control of [
    page.getByRole("button", { name: "选择参考图片" }),
    page.getByRole("button", { name: "登录" }),
    page.getByTitle("开始生成")
  ]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath("home-mobile.png") });
});

test("reduced motion disables nonessential popover animation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockHome(page, false);
  await page.goto("/");

  await page.getByRole("button", { name: "GPT Image 2" }).click();
  await expect(page.getByRole("dialog", { name: "模型偏好" })).toHaveCSS("animation-name", "none");
});

test("pending canvas remains centered and reports durable state", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockCanvas(page, "pending");
  await page.goto("/canvas/project-1?jobId=job-1");

  await expect(page.getByRole("heading", { name: "Fresh Ideas" })).toBeVisible();
  await expect(page.getByText("正在生成图片", { exact: true })).toBeVisible();
  await expect(page.locator('[data-node-kind="pending-image"]')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("canvas-pending-desktop.png") });
});

test("result canvas remains visible on mobile", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCanvas(page, "result");
  await page.goto("/canvas/project-1");

  await expect(page.getByText("项目已保存", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "生成图片" })).toBeVisible();
  const backButton = page.getByTitle("返回首页");
  const backBox = await backButton.boundingBox();
  expect(backBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(backBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: testInfo.outputPath("canvas-result-mobile.png") });
});

async function mockHome(page: Page, signedIn: boolean) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/auth/me") {
      return json(
        route,
        signedIn
          ? {
              user: {
                id: "user-1",
                email: "dora@example.com",
                displayName: "Dora",
                workspaceId: "workspace-1",
                workspaceName: "Dora"
              },
              credits: { balance: 200, reserved: 8, available: 192 }
            }
          : { error: { code: "UNAUTHORIZED", message: "请先登录", requestId: "e2e" } },
        signedIn ? 200 : 401
      );
    }
    if (url.pathname === "/api/v1/models") return json(route, models);
    if (url.pathname === "/api/v1/projects/recent") {
      return json(route, [
        {
          id: "project-1",
          title: "Fresh Ideas",
          prompt: "产品效果图",
          thumbnailUrl: "/inspiration/inspiration-1.jpg",
          version: 2,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:01:00.000Z"
        }
      ]);
    }
    if (url.pathname === "/api/v1/home/feed") {
      return json(route, {
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `feed-${index + 1}`,
          title: `灵感作品 ${index + 1}`,
          author: "AI Studio",
          imageUrl: `/inspiration/inspiration-${(index % 6) + 1}.jpg`,
          aspectRatio: index % 2 === 0 ? 0.82 : 1.08,
          channel: "推荐"
        })),
        nextCursor: null
      });
    }
    return json(route, { error: { code: "NOT_FOUND", message: "not found" } }, 404);
  });
}

async function mockCanvas(page: Page, state: "pending" | "result") {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/projects/project-1") {
      return json(route, {
        id: "project-1",
        title: "Fresh Ideas",
        prompt: "产品效果图",
        thumbnailUrl: state === "result" ? "/inspiration/inspiration-1.jpg" : null,
        version: state === "result" ? 3 : 2,
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:01:00.000Z",
        canvasDocument: {
          schemaVersion: 1,
          projectId: "project-1",
          nodes:
            state === "result"
              ? [
                  {
                    id: "result-job-1",
                    kind: "image",
                    sourceUrl: "/inspiration/inspiration-1.jpg",
                    alt: "生成图片",
                    x: 120,
                    y: 100,
                    width: 800,
                    height: 1000
                  }
                ]
              : [
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
    if (url.pathname === "/api/v1/ai-jobs/job-1") {
      return json(route, {
        id: "job-1",
        projectId: "project-1",
        modelId: "gpt-image-2",
        status: "running",
        prompt: "产品效果图",
        reservedCredits: 8,
        chargedCredits: 0,
        output: null,
        error: null,
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:01:00.000Z"
      });
    }
    return json(route, { error: { code: "NOT_FOUND", message: "not found" } }, 404);
  });
}

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload)
  });
}
