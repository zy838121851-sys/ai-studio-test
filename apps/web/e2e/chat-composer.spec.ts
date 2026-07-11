import { expect, test } from "playwright/test";

const project = {
  id: "project-chat",
  title: "Fresh Ideas",
  prompt: "",
  thumbnailUrl: null,
  version: 1,
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
  canvasDocument: { schemaVersion: 1, projectId: "project-chat", nodes: [] }
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/projects/project-chat-history/conversation") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "conversation-1",
          projectId: "project-chat-history",
          createdAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z",
          messages: [
            {
              id: "message-user",
              role: "user",
              status: "completed",
              content: "A ceramic vase",
              attachmentUploadIds: [],
              job: null,
              createdAt: "2026-07-11T00:00:00.000Z",
              updatedAt: "2026-07-11T00:00:00.000Z"
            },
            {
              id: "message-assistant",
              role: "assistant",
              status: "running",
              content: "Generating image",
              attachmentUploadIds: [],
              job: {
                id: "job-history",
                projectId: "project-chat-history",
                modelId: "gpt-image-2",
                status: "running",
                prompt: "A ceramic vase",
                reservedCredits: 8,
                chargedCredits: 0,
                output: null,
                error: null,
                createdAt: "2026-07-11T00:00:00.000Z",
                updatedAt: "2026-07-11T00:00:00.000Z"
              },
              createdAt: "2026-07-11T00:00:00.000Z",
              updatedAt: "2026-07-11T00:00:00.000Z"
            }
          ]
        })
      });
      return;
    }
    if (path === "/api/v1/projects/project-chat-result/conversation") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "conversation-result",
          projectId: "project-chat-result",
          createdAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z",
          messages: [
            {
              id: "message-result",
              role: "assistant",
              status: "succeeded",
              content: "Generated image",
              attachmentUploadIds: [],
              job: {
                id: "job-result",
                projectId: "project-chat-result",
                modelId: "gpt-image-2",
                status: "succeeded",
                prompt: "A ceramic vase",
                reservedCredits: 8,
                chargedCredits: 8,
                output: {
                  uploadId: "upload-result",
                  url: "/uploads/result.png",
                  width: 1024,
                  height: 1024
                },
                error: null,
                createdAt: "2026-07-11T00:00:00.000Z",
                updatedAt: "2026-07-11T00:00:00.000Z"
              },
              createdAt: "2026-07-11T00:00:00.000Z",
              updatedAt: "2026-07-11T00:00:00.000Z"
            }
          ]
        })
      });
      return;
    }
    if (path === "/api/v1/projects/project-chat-history") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...project, id: "project-chat-history" })
      });
      return;
    }
    if (path === "/api/v1/projects/project-chat-result") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...project, id: "project-chat-result" })
      });
      return;
    }
    if (path === "/api/v1/projects/project-chat") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(project)
      });
      return;
    }
    if (path === "/api/v1/projects/project-chat-image") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...project,
          id: "project-chat-image",
          canvasDocument: {
            schemaVersion: 1,
            projectId: "project-chat-image",
            nodes: [
              {
                id: "image-1",
                kind: "image",
                sourceUrl: "/uploads/canvas-image.png",
                alt: "Generated canvas image",
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
    if (path === "/api/v1/models") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "gpt-image-2",
            label: "GPT Image 2",
            modality: "image",
            enabled: true,
            creditCost: 8
          },
          {
            id: "nano-banana",
            label: "Nano Banana Pro",
            modality: "image",
            enabled: true,
            creditCost: 10
          }
        ])
      });
      return;
    }
    if (path === "/api/v1/uploads" && request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "upload-1",
          url: "/uploads/reference.png",
          contentType: "image/png"
        })
      });
      return;
    }
    if (path === "/api/v1/ai-jobs" && request.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "job-chat",
          projectId: "project-chat",
          status: "queued",
          createdAt: "2026-07-11T00:00:00.000Z",
          updatedAt: "2026-07-11T00:00:00.000Z"
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

test("canvas composer sends prompt, selected model, and uploaded reference", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  let jobPayload: Record<string, unknown> | undefined;
  await page.route("**/api/v1/ai-jobs", async (route) => {
    jobPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "job-chat", projectId: "project-chat", status: "queued" })
    });
  });
  await page.goto("/canvas/project-chat");

  const composer = page.getByRole("form", { name: "Chat composer" });
  await expect(composer).toBeVisible();
  await composer.locator('input[type="file"]').setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
      "base64"
    )
  });
  await expect(composer.getByRole("img", { name: "reference.png" })).toBeVisible();
  await composer.getByLabel("Generation model").selectOption("nano-banana");
  await composer.getByLabel("Prompt").fill("A product illustration");
  await composer.getByLabel("Prompt").press("Control+Enter");

  await expect.poll(() => jobPayload).toBeDefined();
  expect(jobPayload).toMatchObject({
    projectId: "project-chat",
    modelId: "nano-banana",
    prompt: "A product illustration",
    uploadIds: ["upload-1"]
  });
  await expect(composer.getByRole("img", { name: "reference.png" })).toHaveCount(0);
});

test("canvas composer remains visible and touch-sized on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/canvas/project-chat");
  const composer = page.getByRole("form", { name: "Chat composer" });
  await expect(composer).toBeVisible();
  const addReference = composer.getByRole("button", { name: "Add reference" });
  const box = await addReference.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await composer.getByLabel("Prompt").focus();
  await expect(composer.getByLabel("Prompt")).toBeFocused();
});

test("selected canvas image instantly becomes a removable chat reference", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-chat-image");
  const composer = page.getByRole("form", { name: "Chat composer" });
  await expect(composer.getByRole("img", { name: "Generated canvas image" })).toHaveCount(0);

  await page.locator('[data-node-kind="image"]').click({ position: { x: 40, y: 40 } });
  const reference = composer.getByRole("img", { name: "Generated canvas image" });
  await expect(reference).toBeVisible();
  await composer.getByRole("button", { name: "Remove Generated canvas image" }).click();
  await expect(reference).toHaveCount(0);
});

test("canvas restores persisted conversation messages and active job status", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-chat-history");
  const history = page.getByRole("region", { name: "Conversation history" });
  await expect(history.getByText("A ceramic vase")).toBeVisible();
  await expect(history.getByText("Generating", { exact: true })).toBeVisible();
});

test("canvas restores a completed image result in conversation history", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/canvas/project-chat-result");
  const history = page.getByRole("region", { name: "Conversation history" });
  await expect(history.getByText("Completed")).toBeVisible();
  await expect(history.getByRole("img", { name: "Generated result" })).toHaveAttribute(
    "src",
    "/uploads/result.png"
  );
});
