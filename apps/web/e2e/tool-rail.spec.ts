import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/projects/project-1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "project-1",
          title: "Fresh Ideas",
          prompt: "",
          thumbnailUrl: null,
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
          canvasDocument: { schemaVersion: 1, projectId: "project-1", nodes: [] }
        })
      });
      return;
    }
    if (path === "/api/v1/projects/project-eraser") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "project-eraser",
          title: "Eraser",
          prompt: "",
          thumbnailUrl: null,
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
          canvasDocument: {
            schemaVersion: 1,
            projectId: "project-eraser",
            nodes: [
              {
                id: "pending-1",
                kind: "pending-image",
                jobId: "job-1",
                x: 100,
                y: 100,
                width: 100,
                height: 100
              }
            ]
          }
        })
      });
      return;
    }
    if (path === "/api/v1/projects/project-format") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "project-format",
          title: "Formatting",
          prompt: "",
          thumbnailUrl: null,
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
          canvasDocument: {
            schemaVersion: 1,
            projectId: "project-format",
            nodes: [
              {
                id: "shape-1",
                kind: "shape",
                shapeType: "rectangle",
                x: 100,
                y: 100,
                width: 160,
                height: 100,
                style: { fill: "#ffffff", stroke: "#1f2933", strokeWidth: 3 }
              },
              {
                id: "text-1",
                kind: "text",
                text: "Format me",
                x: 380,
                y: 100,
                width: 240,
                height: 80,
                fontFamily: "Inter",
                fontSize: 32,
                fontWeight: "regular",
                color: "#1b2330",
                align: "left"
              }
            ]
          }
        })
      });
      return;
    }
    if (path === "/api/v1/projects/project-image") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "project-image",
          title: "Image",
          prompt: "",
          thumbnailUrl: null,
          version: 1,
          createdAt: "2026-07-10T00:00:00.000Z",
          updatedAt: "2026-07-10T00:00:00.000Z",
          canvasDocument: {
            schemaVersion: 1,
            projectId: "project-image",
            nodes: [
              {
                id: "image-1",
                kind: "image",
                sourceUrl: "/image.png",
                alt: "Generated image",
                x: 100,
                y: 100,
                width: 180,
                height: 120
              }
            ]
          }
        })
      });
      return;
    }
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found" } })
    });
  });
});

test("desktop tool rail preserves active, submenu, and collapse behavior", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-1");
  const rail = page.getByRole("complementary", { name: "Canvas tools" });
  await expect(rail).toBeVisible();
  await page.getByRole("button", { name: "Shape" }).click();
  await expect(page.getByRole("menu", { name: "Shape options" })).toBeVisible();
  await page.getByRole("button", { name: "Collapse tools" }).click();
  await expect(page.getByRole("button", { name: "Expand tools" })).toBeVisible();
});

test("mobile tool rail keeps touch-sized buttons", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/canvas/project-1");
  const button = page.getByRole("button", { name: "Select" });
  const box = await button.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("pen path follows sampled pointer movement", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-1");
  await page.getByRole("button", { name: "Pen" }).click();
  const surface = page.locator(".canvas-adapter");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 100, (box?.y ?? 0) + 100);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 160, (box?.y ?? 0) + 145);
  await page.mouse.up();
  await expect(page.locator('[data-node-kind="pen"] path')).toHaveAttribute("d", /M.*L/);
});

test("laser path follows sampled pointer movement", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-1");
  await page.getByRole("button", { name: "Laser" }).click();
  const surface = page.locator(".canvas-adapter");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 100, (box?.y ?? 0) + 100);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 160, (box?.y ?? 0) + 145);
  await expect(page.locator(".canvas-laser-overlay polyline")).toHaveAttribute(
    "points",
    /100,100.*160,145/
  );
  await page.mouse.up();
});

test("eraser only removes the node at the sampled pointer location", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-eraser");
  await expect(page.locator('[data-node-kind="pending-image"]')).toBeVisible();
  await page.getByRole("button", { name: "Eraser" }).click();
  const surface = page.locator(".canvas-adapter");
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click((box?.x ?? 0) + 130, (box?.y ?? 0) + 130);
  await expect(page.locator('[data-node-kind="pending-image"]')).toHaveCount(0);
});

test("shape and text formatting stay bound to the selected node", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-format");

  await page.locator('[data-node-kind="shape"]').click({ position: { x: 40, y: 40 } });
  await expect(page.getByRole("toolbar", { name: "Shape formatting" })).toBeVisible();
  const strokeWidth = page.locator('[aria-label="Stroke width"]');
  await strokeWidth.focus();
  await strokeWidth.press("ArrowRight");
  await strokeWidth.press("ArrowRight");
  await strokeWidth.press("ArrowRight");
  await strokeWidth.press("ArrowRight");
  await strokeWidth.press("ArrowRight");
  await expect(page.locator('[data-node-kind="shape"] rect')).toHaveAttribute("stroke-width", "8");

  await page.locator('[data-node-kind="text"]').click({ position: { x: 30, y: 30 } });
  await expect(page.getByRole("toolbar", { name: "Text formatting" })).toBeVisible();
  await page.locator('[aria-label="Font size"]').selectOption("64");
  await expect(page.locator('[data-node-kind="text"]')).toHaveCSS("font-size", "64px");
});

test("selected image exposes the complete image action toolbar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-image");
  await page.locator('[data-node-kind="image"]').click({ position: { x: 40, y: 40 } });
  const toolbar = page.getByRole("toolbar", { name: "图片工具" });
  await expect(toolbar).toBeVisible();
  for (const label of ["裁剪", "高清", "抠图", "扩图", "改字", "对比图", "3D"]) {
    await expect(toolbar.getByRole("button", { name: label })).toBeVisible();
  }
  await toolbar.getByRole("button", { name: "高清" }).click();
  await expect(page.getByRole("group", { name: "高清尺寸" })).toBeVisible();
  await page.getByRole("button", { name: "4K" }).click();
  await expect(page.getByRole("button", { name: "4K" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "2K" })).toHaveAttribute("aria-pressed", "false");
});
