import express from "express";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-apimart-"));
process.env.DB_PATH = join(tempRoot, "apimart.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.APIMART_MOCK = "true";

const { initializeDatabase, closeDatabase, execute } = await import("../src/server/db/sqlite.js");
const { runCreditsMigration } = await import("../src/server/db/credits-migration.js");
const { ensureCreditAccount, getCreditBalance } = await import("../src/server/services/credits/credit.service.js");
const { createAIRouter } = await import("../src/server/routes/ai.routes.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoPublicApimart(payload, label) {
  const text = JSON.stringify(payload);
  assert(!/provider"\s*:\s*"apimart/i.test(text), `${label} leaked provider apimart`);
  assert(!/via apimart|gateway|proxy|中转/i.test(text), `${label} leaked forbidden provider wording`);
}

initializeDatabase();
runCreditsMigration({ grantExistingUsers: false });
execute(`
  INSERT INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
  VALUES ('apimart-user', 'apimart@example.com', 'APIMart User', '', '', ${Date.now()}, ${Date.now()});
`);
ensureCreditAccount("apimart-user", { initialCredits: 500, reason: "test_grant" });

const app = express();
app.use(express.json({ limit: "4mb" }));
app.use((req, _res, next) => {
  req.auth = { user: { id: "apimart-user" } };
  next();
});
app.use("/api", createAIRouter());

const server = await new Promise((resolve) => {
  const nextServer = app.listen(0, () => resolve(nextServer));
});

try {
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const before = getCreditBalance("apimart-user").balanceCredits;

  const syncImage = await postJson(`${baseUrl}/api/ai/generate`, {
    modelId: "seedream-5-lite",
    prompt: "mock sync image"
  });
  assert(syncImage.imageUrl?.startsWith("/uploads/"), "Sync image should be saved to local uploads");
  assert(syncImage.billing?.creditsCharged === 12, "Sync image should charge Seedream credits");
  assertNoPublicApimart(syncImage, "sync image response");

  const pendingImage = await postJson(`${baseUrl}/api/ai/generate`, {
    modelId: "seedream-5-lite",
    prompt: "mock-apimart-pending image"
  });
  assert(pendingImage.jobId, "Pending image should return a local job id");
  assert(pendingImage.billing?.status === "reserved", "Pending image should reserve credits");
  assertNoPublicApimart(pendingImage, "pending image response");

  const imageJob = await getJson(`${baseUrl}/api/ai/jobs/${pendingImage.jobId}`);
  assert(imageJob.status === "succeeded", "Pending image mock job should finish");
  assert(imageJob.imageUrl?.startsWith("/uploads/"), "Image job output should be local");
  assertNoPublicApimart(imageJob, "image job response");

  const midjourney = await postJson(`${baseUrl}/api/ai/generate`, {
    modelId: "midjourney",
    prompt: "mock-apimart-pending midjourney"
  });
  assert(midjourney.jobId, "Midjourney should return a local job id");
  assert(midjourney.billing?.status === "reserved", "Midjourney should reserve one task worth of credits");

  const midjourneyJob = await getJson(`${baseUrl}/api/ai/jobs/${midjourney.jobId}`);
  assert(midjourneyJob.status === "succeeded", "Midjourney mock job should finish");
  assert(Array.isArray(midjourneyJob.outputs) && midjourneyJob.outputs.length === 4, "Midjourney job should return four output assets");
  assert(Array.isArray(midjourneyJob.imageUrls) && midjourneyJob.imageUrls.length === 4, "Midjourney job should return four image URLs");
  assertNoPublicApimart(midjourneyJob, "midjourney job response");

  const video = await postJson(`${baseUrl}/api/ai/generate`, {
    modelId: "seedance-2",
    prompt: "mock video",
    videoOptions: {
      duration: 5,
      size: "16:9",
      resolution: "720p",
      generate_audio: false
    }
  });
  assert(video.jobId, "Video should return a local job id");
  assert(video.billing?.status === "reserved", "Video should reserve credits");
  assertNoPublicApimart(video, "video response");

  const videoJob = await getJson(`${baseUrl}/api/ai/jobs/${video.jobId}`);
  assert(videoJob.status === "succeeded", "Video mock job should finish");
  assert(videoJob.videoUrl?.startsWith("/uploads/"), "Video job output should be local");
  assertNoPublicApimart(videoJob, "video job response");

  const after = getCreditBalance("apimart-user").balanceCredits;
  assert(after === before - 12 - 12 - 8 - 18, "Successful mock jobs should charge configured credits");

  const invalidVideo = await fetch(`${baseUrl}/api/ai/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelId: "seedance-2",
      prompt: "invalid option",
      videoOptions: { duration: 999 }
    })
  });
  const invalidPayload = await invalidVideo.json();
  assert(!invalidVideo.ok, "Invalid video option should fail");
  assert(/Unsupported duration/.test(invalidPayload.message), "Invalid video option should return a clear error");
} finally {
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("APIMart mock checks passed.");

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  assert(response.ok, `${url} failed: ${response.status} ${body.message || ""}`);
  return body;
}

async function getJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  assert(response.ok, `${url} failed: ${response.status} ${body.message || ""}`);
  return body;
}
