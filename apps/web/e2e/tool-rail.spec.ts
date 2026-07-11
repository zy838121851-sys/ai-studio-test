import { expect, test } from "playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/projects/project-1") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "project-1", title: "Fresh Ideas", prompt: "", thumbnailUrl: null, version: 1, createdAt: "2026-07-10T00:00:00.000Z", updatedAt: "2026-07-10T00:00:00.000Z", canvasDocument: { schemaVersion: 1, projectId: "project-1", nodes: [] } }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found" } }) });
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
