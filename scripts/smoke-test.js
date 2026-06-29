import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-smoke-"));
process.env.NODE_ENV = "test";
process.env.DASHSCOPE_API_KEY = "";
process.env.APIMART_MOCK = "true";
process.env.DB_PATH = join(tempRoot, "smoke.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.PORT = "0";

const { createServer } = await import("../src/server/index.js");
const { closeDatabase } = await import("../src/server/db/sqlite.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function start(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on("error", reject);
  });
}

async function request(baseUrl, path, { method = "GET", body, cookie, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return {
    status: response.status,
    headers: response.headers,
    data
  };
}

let server;
try {
  const app = createServer();
  server = await start(app);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await request(baseUrl, "/api/health");
  assert(health.status === 200, `health expected 200, got ${health.status}`);
  assert(health.headers.get("x-content-type-options") === "nosniff", "security header X-Content-Type-Options missing");
  assert((health.headers.get("content-security-policy") || "").includes("frame-ancestors"), "CSP frame-ancestors missing");

  const authProviders = await request(baseUrl, "/api/auth/providers");
  assert(authProviders.status === 200, `auth providers expected 200, got ${authProviders.status}`);
  assert(authProviders.data.emailCode?.configured === true, "email code provider should be configured in test mode");
  assert(authProviders.data.smsCode?.configured === true, "sms code provider should be configured in test mode");
  assert(authProviders.data.oauth?.wechat?.configured === false, "wechat OAuth should be unconfigured in smoke test");
  assert(authProviders.data.oauth?.qq?.configured === false, "qq OAuth should be unconfigured in smoke test");

  const unauthProjects = await request(baseUrl, "/api/projects");
  assert(unauthProjects.status === 401, `unauth projects expected 401, got ${unauthProjects.status}`);

  const register = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: `smoke-${Date.now()}@example.test`,
      password: "correct-horse-battery",
      name: "Smoke Test"
    }
  });
  assert(register.status === 201, `register expected 201, got ${register.status}`);
  const cookie = register.headers.get("set-cookie")?.split(";")[0] || "";
  assert(cookie.includes("ai_studio_session="), "register did not set session cookie");

  const duplicate = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: register.data.user.email,
      password: "correct-horse-battery",
      name: "Smoke Test"
    }
  });
  assert(duplicate.status === 409, `duplicate register expected 409, got ${duplicate.status}`);

  const passwordLogin = await request(baseUrl, "/api/auth/login", {
    method: "POST",
    body: {
      email: register.data.user.email,
      password: "correct-horse-battery"
    }
  });
  assert(passwordLogin.status === 200, `password login expected 200, got ${passwordLogin.status}`);
  assert(passwordLogin.headers.get("set-cookie")?.includes("ai_studio_session="), "password login did not set session cookie");

  const emailCode = await request(baseUrl, "/api/auth/code/send", {
    method: "POST",
    body: {
      channel: "email",
      target: `code-${Date.now()}@example.test`,
      purpose: "login"
    }
  });
  assert(emailCode.status === 200, `send email code expected 200, got ${emailCode.status}`);
  assert(emailCode.data.code, "mock email code was not returned in test mode");

  const emailCodeLogin = await request(baseUrl, "/api/auth/code/verify", {
    method: "POST",
    body: {
      channel: "email",
      target: emailCode.data.target,
      code: emailCode.data.code,
      purpose: "login",
      name: "Email Code Smoke"
    }
  });
  assert(emailCodeLogin.status === 200, `email code verify expected 200, got ${emailCodeLogin.status}`);
  assert(emailCodeLogin.headers.get("set-cookie")?.includes("ai_studio_session="), "email code verify did not set cookie");

  const phoneCode = await request(baseUrl, "/api/auth/code/send", {
    method: "POST",
    body: {
      channel: "sms",
      target: "+8613800000000",
      purpose: "login"
    }
  });
  assert(phoneCode.status === 200, `send phone code expected 200, got ${phoneCode.status}`);
  assert(phoneCode.data.code, "mock phone code was not returned in test mode");

  const phoneCodeLogin = await request(baseUrl, "/api/auth/code/verify", {
    method: "POST",
    body: {
      channel: "sms",
      target: phoneCode.data.target,
      code: phoneCode.data.code,
      purpose: "login",
      name: "Phone Code Smoke"
    }
  });
  assert(phoneCodeLogin.status === 200, `phone code verify expected 200, got ${phoneCodeLogin.status}`);

  const wechatStart = await request(baseUrl, "/api/auth/oauth/wechat/start?format=json");
  assert(wechatStart.status === 503, `unconfigured wechat start expected 503, got ${wechatStart.status}`);

  const project = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie,
    body: { title: "Smoke Project", prompt: "smoke" }
  });
  assert(project.status === 201, `create project expected 201, got ${project.status}`);

  const saveCanvas = await request(baseUrl, `/api/projects/${project.data.project.id}/save-canvas`, {
    method: "POST",
    cookie,
    body: {
      title: "Smoke Project Saved",
      prompt: "smoke saved",
      itemCount: 1,
      thumbnail: "/uploads/example.png",
      canvasSnapshotJson: JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        nodes: [{
          kind: "text",
          title: "Snapshot",
          x: 12,
          y: 34,
          html: "<p onclick=\"alert(1)\">safe</p><script>alert(1)</script><a href=\"javascript:alert(1)\">x</a>",
          media: { url: "javascript:alert(1)" }
        }]
      })
    }
  });
  assert(saveCanvas.status === 200, `save canvas expected 200, got ${saveCanvas.status}`);
  assert(saveCanvas.data.project?.canvasSnapshotJson, "save canvas did not return canvasSnapshotJson");
  assert(!/script|onclick|javascript:/i.test(saveCanvas.data.project.canvasSnapshotJson), "snapshot sanitizer left dangerous HTML/URL");

  const restoredProject = await request(baseUrl, `/api/projects/${project.data.project.id}`, { cookie });
  assert(restoredProject.status === 200, `restore project expected 200, got ${restoredProject.status}`);
  assert(restoredProject.data.project.canvasSnapshotJson === saveCanvas.data.project.canvasSnapshotJson, "restored project snapshot did not match saved snapshot");

  const missingConversation = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie,
    body: { projectId: "missing-project" }
  });
  assert(missingConversation.status === 404, `missing project conversation expected 404, got ${missingConversation.status}`);
  assert(/Project not found/i.test(missingConversation.data.message || ""), "missing project conversation should report Project not found");

  const conversation = await request(baseUrl, "/api/conversations", {
    method: "POST",
    cookie,
    body: { projectId: project.data.project.id }
  });
  assert(conversation.status === 200, `create conversation expected 200, got ${conversation.status}`);
  assert(conversation.data.conversation?.id, "conversation create did not return an id");

  const form = new FormData();
  const png = new Blob([
    Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de", "hex")
  ], { type: "image/png" });
  form.append("file", png, "smoke.png");
  form.append("projectId", project.data.project.id);
  const upload = await request(baseUrl, "/api/assets/upload", {
    method: "POST",
    cookie,
    body: form
  });
  assert(upload.status === 201, `upload expected 201, got ${upload.status}`);
  assert(upload.data.asset?.url, "upload did not return an asset URL");

  const collection = await request(baseUrl, "/api/asset-collections", {
    method: "POST",
    cookie,
    body: { name: "Smoke Collection" }
  });
  assert(collection.status === 201, `create collection expected 201, got ${collection.status}`);

  const moved = await request(baseUrl, `/api/assets/${upload.data.asset.id}/move-to-collection`, {
    method: "POST",
    cookie,
    body: { collectionId: collection.data.collection.id }
  });
  assert(moved.status === 200, `move asset expected 200, got ${moved.status}`);
  assert(moved.data.asset.collectionId === collection.data.collection.id, "moved asset did not keep collectionId");

  const projectAssets = await request(baseUrl, `/api/assets?projectId=${encodeURIComponent(project.data.project.id)}`, { cookie });
  assert(projectAssets.status === 200, `list project assets expected 200, got ${projectAssets.status}`);
  assert(projectAssets.data.assets.some((asset) => asset.id === upload.data.asset.id), "project asset link was not listed");

  const collectionAssets = await request(baseUrl, `/api/asset-collections/${collection.data.collection.id}/assets`, { cookie });
  assert(collectionAssets.status === 200, `collection assets expected 200, got ${collectionAssets.status}`);
  assert(collectionAssets.data.assets.some((asset) => asset.id === upload.data.asset.id), "collection assets did not include uploaded asset");

  const uploadedFile = await request(baseUrl, upload.data.asset.url, { cookie });
  assert(uploadedFile.status === 200, `protected upload expected 200, got ${uploadedFile.status}`);

  const blockedProxy = await request(baseUrl, "/api/image-proxy?url=http://localhost/private.png", { cookie });
  assert(blockedProxy.status === 400, `localhost image proxy expected 400, got ${blockedProxy.status}`);

  const balanceBeforeAI = await request(baseUrl, "/api/credits/balance", { cookie });
  assert(balanceBeforeAI.status === 200, `balance before AI expected 200, got ${balanceBeforeAI.status}`);

  const unauthGenerate = await request(baseUrl, "/api/ai/generate", {
    method: "POST",
    body: { prompt: "smoke", modelId: "gpt-image-2" }
  });
  assert(unauthGenerate.status === 401, `unauth AI generate expected 401, got ${unauthGenerate.status}`);

  const jobCreate = await request(baseUrl, "/api/ai/generate", {
    method: "POST",
    cookie,
    body: {
      prompt: "smoke job",
      modelId: "gpt-image-2",
      images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="],
      inputAssetIds: [upload.data.asset.id]
    }
  });
  assert(jobCreate.status === 200, `AI job create expected 200, got ${jobCreate.status}`);
  assert(jobCreate.data.jobId, "AI job create did not return jobId");
  assert(jobCreate.data.requestedModel === "gpt-image-2", "AI generate did not expose requestedModel");
  assert(jobCreate.data.providerModel === "gpt-image-2", "AI generate did not expose providerModel");
  assert(jobCreate.data.job?.outputAssetIds?.length > 0, "AI job did not persist output asset link");
  assert(jobCreate.data.outputs?.[0]?.url, "AI job did not return saved output asset");

  const jobRead = await request(baseUrl, `/api/ai/jobs/${jobCreate.data.jobId}`, { cookie });
  assert(jobRead.status === 200, `AI job read expected 200, got ${jobRead.status}`);
  assert(jobRead.data.outputCount > 0, "AI job read did not return output assets");
  assert("failureCode" in jobRead.data, "AI job read did not expose failureCode");
  assert("failureMessage" in jobRead.data, "AI job read did not expose failureMessage");
  assert(jobRead.data.requestData?.imageCount === 1, "AI job detail did not persist request image count");
  assert(jobRead.data.requestData?.images?.[0]?.mimeType === "image/png", "AI job request log did not summarize reference image");
  assert(!JSON.stringify(jobRead.data.requestData).includes("base64,"), "AI job request log leaked base64 image data");

  const jobList = await request(baseUrl, "/api/ai/jobs?limit=10", { cookie });
  assert(jobList.status === 200, `AI job list expected 200, got ${jobList.status}`);
  assert(jobList.data.jobs.some((job) => job.id === jobCreate.data.jobId), "AI job list did not include created job");
  assert(jobList.data.total >= 1, "AI job list did not return total count");

  const jobSearch = await request(baseUrl, `/api/ai/jobs?q=${encodeURIComponent(jobCreate.data.jobId.slice(0, 8))}`, { cookie });
  assert(jobSearch.status === 200, `AI job search expected 200, got ${jobSearch.status}`);
  assert(jobSearch.data.jobs.some((job) => job.id === jobCreate.data.jobId), "AI job search did not find created job");

  const jobStatusFilter = await request(baseUrl, "/api/ai/jobs?status=succeeded&type=image", { cookie });
  assert(jobStatusFilter.status === 200, `AI job status filter expected 200, got ${jobStatusFilter.status}`);
  assert(jobStatusFilter.data.jobs.every((job) => job.status === "succeeded" && job.type === "image"), "AI job status/type filter returned mismatched rows");

  const videoReferenceJob = await request(baseUrl, "/api/ai/generate", {
    method: "POST",
    cookie,
    body: {
      prompt: "smoke video reference job",
      modelId: "seedance-2",
      images: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="],
      videoOptions: {
        duration: 5,
        size: "16:9",
        resolution: "720p",
        generate_audio: false
      }
    }
  });
  assert(videoReferenceJob.status === 200, `video reference job expected 200, got ${videoReferenceJob.status}`);
  assert(videoReferenceJob.data.jobId, "video reference job did not return jobId");

  const videoReferenceRead = await request(baseUrl, `/api/ai/jobs/${videoReferenceJob.data.jobId}`, { cookie });
  assert(videoReferenceRead.status === 200, `video reference job read expected 200, got ${videoReferenceRead.status}`);
  assert(videoReferenceRead.data.status === "succeeded", `video reference job expected succeeded, got ${videoReferenceRead.data.status}`);
  assert(videoReferenceRead.data.videoUrl?.startsWith("/uploads/"), "video reference job did not return a saved video output");
  assert(videoReferenceRead.data.requestData?.imageCount === 1, "video reference request log did not keep reference image count");
  assert(videoReferenceRead.data.responseData?.referenceImageNormalization?.finalUrlCount === 1, "video response log did not include normalized reference count");
  assert(!JSON.stringify(videoReferenceRead.data.requestData).includes("base64,"), "video reference request log leaked base64 image data");

  const failedGenerate = await request(baseUrl, "/api/ai/generate", {
    method: "POST",
    cookie,
    body: {
      prompt: "mock-apimart-fail",
      modelId: "gpt-image-2"
    }
  });
  assert(failedGenerate.status === 502, `failed AI generate expected 502, got ${failedGenerate.status}`);
  assert(failedGenerate.data.jobId, "failed AI generate did not return a local jobId");
  const failedJob = await request(baseUrl, `/api/ai/jobs/${failedGenerate.data.jobId}`, { cookie });
  assert(failedJob.status === 200, `failed AI job detail expected 200, got ${failedJob.status}`);
  assert(failedJob.data.status === "failed", `failed AI job status expected failed, got ${failedJob.data.status}`);
  assert(failedJob.data.failureCode, "failed AI job did not expose failureCode");
  assert(/mock apimart image failure/i.test(failedJob.data.failureMessage || ""), "failed AI job did not preserve provider failure message");

  const secondCookie = emailCodeLogin.headers.get("set-cookie")?.split(";")[0] || "";
  const crossUserJob = await request(baseUrl, `/api/ai/jobs/${jobCreate.data.jobId}`, { cookie: secondCookie });
  assert(crossUserJob.status === 404, `cross-user AI job detail expected 404, got ${crossUserJob.status}`);
  const crossUserList = await request(baseUrl, "/api/ai/jobs?limit=50", { cookie: secondCookie });
  assert(crossUserList.status === 200, `cross-user AI job list expected 200, got ${crossUserList.status}`);
  assert(!crossUserList.data.jobs.some((job) => job.id === jobCreate.data.jobId), "cross-user AI job list leaked another user's job");

  const balanceAfterAI = await request(baseUrl, "/api/credits/balance", { cookie });
  assert(balanceAfterAI.status === 200, `balance after AI expected 200, got ${balanceAfterAI.status}`);
  assert(
    balanceAfterAI.data.balance.balanceCredits < balanceBeforeAI.data.balance.balanceCredits,
    "AI requests did not deduct credits"
  );

  console.log("Smoke test passed.");
} finally {
  await new Promise((resolve) => server?.close(resolve) || resolve());
  closeDatabase();
  rmSync(tempRoot, { recursive: true, force: true });
}
