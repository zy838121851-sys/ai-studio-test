import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAIErrorResponseBody,
  classifyAIError,
  createAIAsyncHandler,
  sendAIErrorResponse,
  toClientFailure
} from "../src/server/lib/ai-error-response.js";
import {
  buildGenerationFailureLog,
  buildGenerationRequestLog,
  buildGenerationResponseLog,
  buildTripo3DRequestLog,
  buildTripo3DResponseLog
} from "../src/server/lib/ai-job-log-payload.js";
import {
  buildDeferredImageEditResult,
  sanitizeGenerationResult,
  toClientAsset,
  toClientBilling,
  toClientJob
} from "../src/server/lib/ai-response-dto.js";
import {
  assertResolvedProviderMatchesModel,
  assertTripo3DModelConfig,
  assertTripo3DRequiredInput,
  buildTripo3DChargeReservationParams,
  buildTripo3DDispatchParams,
  buildTripo3DDispatchResultParams,
  buildTripo3DFailJobParams,
  buildTripo3DJobRecordParams,
  buildTripo3DQuoteParams,
  buildTripo3DReleaseReservationParams,
  buildTripo3DRequestLogParams,
  buildTripo3DReserveCreditsParams,
  buildTripo3DRemoteFailureParams,
  buildTripo3DSuccessResponse,
  getInitialAIJobStatus,
  getModelModality,
  getTripo3DJobMetadata,
  getTripo3DProviderModel,
  hasRemoteFallbackModelOutput,
  isFixedQwenImageEditAction,
  isValidTripoImageInput,
  jobStatusForError,
  normalizeTripo3DJobInput,
  normalizeImages,
  validateVideoOptions
} from "../src/server/lib/ai-route-helpers.js";
import { logAIModelRoute, logAIProviderRoute } from "../src/server/lib/ai-route-logging.js";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-error-contract-"));
process.env.DB_PATH = join(tempRoot, "api-error-contract.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";
process.env.APIMART_MOCK = "true";

let server = null;
let closeDatabaseRef = null;
const restoreConsole = suppressAuditLogs();

try {
  assertNoInlineMessageErrorResponses();
  assertAIErrorClassification();
  assertAIErrorResponseBody();
  await assertAIAsyncHandler();
  assertAIJobLogPayloads();
  assertAIResponseDtos();
  assertAIRouteHelpers();
  assertAIRouteLogging();
  assertGenerationTransformHelpers();

  const { createServer } = await import("../src/server/index.js");
  const { closeDatabase } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const unauthProjectList = await request(baseUrl, "/api/projects");
  assertErrorContract(unauthProjectList, {
    label: "unauthenticated protected route",
    status: 401,
    message: "Authentication required"
  });

  const userA = await register(baseUrl, "api-error-a@example.com", "API Error A");
  const userB = await register(baseUrl, "api-error-b@example.com", "API Error B");

  const duplicateRegister = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: "api-error-a@example.com",
      password: "password123",
      name: "Duplicate"
    }
  });
  assertErrorContract(duplicateRegister, {
    label: "duplicate registration",
    status: 409,
    message: "Email already registered"
  });

  const invalidProjectSnapshot = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Invalid snapshot",
      canvasSnapshotJson: "{invalid"
    }
  });
  assertErrorContract(invalidProjectSnapshot, {
    label: "invalid project snapshot",
    status: 400,
    message: "Invalid canvas snapshot JSON"
  });

  const project = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Owner project",
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(project.status === 201, "owner project create should succeed");
  assert(project.body?.project?.id, "owner project create should return an id");

  const crossUserProject = await request(baseUrl, `/api/projects/${project.body.project.id}`, {
    cookie: userB.cookie
  });
  assertErrorContract(crossUserProject, {
    label: "cross-user project read",
    status: 404,
    message: "Project not found"
  });

  const missingUploadFile = await request(baseUrl, "/api/assets/upload", {
    method: "POST",
    cookie: userA.cookie,
    body: new FormData()
  });
  assertErrorContract(missingUploadFile, {
    label: "upload without file",
    status: 400,
    message: "File is required"
  });

  const blockedImageProxy = await request(baseUrl, "/api/image-proxy?url=http://localhost/private.png", {
    cookie: userA.cookie
  });
  assertErrorContract(blockedImageProxy, {
    label: "blocked image proxy",
    status: 400
  });

  const missingAiJob = await request(baseUrl, "/api/ai/jobs/missing-job-id", {
    cookie: userA.cookie
  });
  assertErrorContract(missingAiJob, {
    label: "missing AI job",
    status: 404,
    message: "Job not found"
  });

  const failedGenerate = await request(baseUrl, "/api/ai/generate", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      prompt: "mock-apimart-fail",
      modelId: "gpt-image-2"
    }
  });
  assertRichAIErrorContract(failedGenerate, {
    label: "failed AI generate",
    status: 502,
    failureCode: "MOCK_APIMART_IMAGE_FAILED",
    failureMessage: "Mock APIMart image failure",
    stage: "provider"
  });

  console.log("API error contract checks passed.");
} finally {
  restoreConsole();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertErrorContract(response, { label, status, message } = {}) {
  assert(response.status === status, `${label} expected ${status}, got ${response.status}`);
  assert(
    response.contentType.includes("application/json"),
    `${label} should return application/json, got ${response.contentType || "(missing)"}`
  );
  assert(response.body && typeof response.body === "object" && !Array.isArray(response.body), `${label} should return a JSON object`);
  assert(typeof response.body.message === "string" && response.body.message.trim(), `${label} should return a non-empty message`);
  if (message) {
    assert(response.body.message === message, `${label} expected message "${message}", got "${response.body.message}"`);
  }
  assert(!("stack" in response.body), `${label} should not expose stack`);
  assert(!("trace" in response.body), `${label} should not expose trace`);
}

function assertRichAIErrorContract(response, { label, status, failureCode, failureMessage, stage } = {}) {
  assertErrorContract(response, {
    label,
    status,
    message: failureMessage
  });
  assert(response.body.errorCode === failureCode, `${label} expected errorCode "${failureCode}", got "${response.body.errorCode}"`);
  assert(response.body.failureCode === failureCode, `${label} expected failureCode "${failureCode}", got "${response.body.failureCode}"`);
  assert(response.body.errorMessage === failureMessage, `${label} expected errorMessage "${failureMessage}", got "${response.body.errorMessage}"`);
  assert(response.body.failureMessage === failureMessage, `${label} expected failureMessage "${failureMessage}", got "${response.body.failureMessage}"`);
  assert(response.body.stage === stage, `${label} expected stage "${stage}", got "${response.body.stage}"`);
  assert(response.body.jobId, `${label} should return the failed local job id`);
  assert(response.body.job?.id === response.body.jobId, `${label} should return a job matching jobId`);
}

function assertAIErrorClassification() {
  assertDeepEqual(
    classifyAIError(errorWith({ status: 401, message: "Authentication required" }), { path: "/ai/generate" }),
    { failureCode: "LOGIN_REQUIRED", failureMessage: "Authentication required", stage: "auth" },
    "401 AI errors should classify as auth failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ status: 402, message: "Insufficient credits" }), { path: "/ai/generate" }),
    { failureCode: "INSUFFICIENT_CREDITS", failureMessage: "Insufficient credits", stage: "billing" },
    "402 AI errors should classify as billing failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ status: 404, message: "Job not found" }), { path: "/ai/jobs/missing" }),
    { failureCode: "JOB_NOT_FOUND", failureMessage: "Job not found", stage: "jobPoll" },
    "AI job 404 errors should classify as job polling failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ status: 400, code: "BAD_IMAGE", message: "Bad image" }), { path: "/image-proxy" }),
    { failureCode: "BAD_IMAGE", failureMessage: "Bad image", stage: "request" },
    "400 AI errors should preserve explicit request failure codes"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ message: "Provider timed out" }), { path: "/ai/generate" }),
    { failureCode: "JOB_TIMEOUT", failureMessage: "Provider timed out", stage: "jobPoll" },
    "timeout AI errors should classify as job polling failures"
  );
  assertDeepEqual(
    classifyAIError(errorWith({ message: "Generated output could not be saved locally" }), { path: "/ai/generate" }),
    { failureCode: "OUTPUT_SAVE_FAILED", failureMessage: "Generated output could not be saved locally", stage: "outputPersist" },
    "output persistence errors should classify as output persistence failures"
  );
  assertDeepEqual(
    toClientFailure({ errorCode: "PROVIDER_FAILED", errorMessage: "provider exploded" }, "AI_JOB_FAILED"),
    {
      errorCode: "PROVIDER_FAILED",
      errorMessage: "provider exploded",
      failureCode: "PROVIDER_FAILED",
      failureMessage: "provider exploded"
    },
    "AI job failures should preserve stored error details"
  );
}

function assertAIErrorResponseBody() {
  const failure = {
    failureCode: "PROVIDER_FAILED",
    failureMessage: "provider exploded",
    stage: "provider"
  };
  assertDeepEqual(
    buildAIErrorResponseBody(failure),
    {
      message: "provider exploded",
      errorCode: "PROVIDER_FAILED",
      errorMessage: "provider exploded",
      failureCode: "PROVIDER_FAILED",
      failureMessage: "provider exploded",
      stage: "provider"
    },
    "AI error response body should preserve the route error contract without a job"
  );
  assertDeepEqual(
    buildAIErrorResponseBody(failure, {
      id: "job-1",
      provider: "apimart",
      vendor: "",
      modelId: "gpt-image-2",
      providerModel: "",
      type: "image",
      status: "failed",
      progress: 0,
      promptPreview: "",
      inputAssetIds: [],
      outputAssetIds: [],
      creditsReserved: 8,
      creditsCharged: 0,
      failureCode: "PROVIDER_FAILED",
      failureMessage: "provider exploded",
      createdAt: 0,
      updatedAt: 0,
      completedAt: null
    }),
    {
      message: "provider exploded",
      errorCode: "PROVIDER_FAILED",
      errorMessage: "provider exploded",
      failureCode: "PROVIDER_FAILED",
      failureMessage: "provider exploded",
      stage: "provider",
      job: {
        id: "job-1",
        modelId: "gpt-image-2",
        providerModel: "",
        vendor: "",
        type: "image",
        status: "failed",
        progress: 0,
        promptPreview: "",
        inputAssetIds: [],
        outputAssetIds: [],
        outputCount: 0,
        remoteTaskId: "",
        errorCode: "",
        errorMessage: "",
        failureCode: "PROVIDER_FAILED",
        failureMessage: "provider exploded",
        creditsReserved: 8,
        creditsCharged: 0,
        createdAt: 0,
        updatedAt: 0,
        completedAt: null,
        durationMs: null
      },
      jobId: "job-1"
    },
    "AI error response body should include the client job DTO when a failed job is available"
  );
}

async function assertAIAsyncHandler() {
  const successCalls = [];
  const successHandler = createAIAsyncHandler()(
    async (req, res) => {
      successCalls.push({ req, res });
      res.json({ ok: true });
    }
  );
  const successRes = fakeResponse();
  await successHandler({ method: "GET", path: "/ai/success" }, successRes);
  assert(successCalls.length === 1, "AI async handler should call successful handlers");
  assert(successRes.statusCode === 200, "AI async handler should keep successful response status");
  assertDeepEqual(successRes.body, { ok: true }, "AI async handler should preserve successful response body");

  const entries = [];
  const responses = [];
  const failure = {
    failureCode: "BAD_IMAGE",
    failureMessage: "Bad image",
    stage: "request"
  };
  const failedJob = {
    id: "job-failed",
    status: "failed",
    outputAssetIds: []
  };
  const wrapped = createAIAsyncHandler({
    classifier: (error, context) => {
      entries.push({ type: "classify", error, context });
      return failure;
    },
    logger: (message, error, detail) => {
      entries.push({ type: "log", message, error, detail });
    },
    responder: (res, error, responseFailure, errorJob) => {
      responses.push({ res, error, failure: responseFailure, errorJob });
    }
  })(async () => {
    const error = new Error("Bad image");
    error.status = 400;
    error.job = failedJob;
    throw error;
  });
  const failureReq = { method: "POST", path: "/ai/generate" };
  const failureRes = fakeResponse();
  await wrapped(failureReq, failureRes);
  assert(entries.length === 2, "AI async handler should classify and log failures");
  assert(entries[0].type === "classify", "AI async handler should classify failures before logging");
  assert(entries[0].context.path === "/ai/generate", "AI async handler should pass the request path to classification");
  assert(entries[1].type === "log", "AI async handler should log classified failures");
  assert(entries[1].message === "AI request failed", "AI async handler should preserve the log message");
  assertDeepEqual(entries[1].detail, {
    method: "POST",
    path: "/ai/generate",
    failureCode: "BAD_IMAGE",
    stage: "request"
  }, "AI async handler should preserve failure log details");
  assert(responses.length === 1, "AI async handler should send one failure response");
  assert(responses[0].res === failureRes, "AI async handler should pass through the response object");
  assert(responses[0].failure === failure, "AI async handler should pass the classified failure to the responder");
  assert(responses[0].errorJob === failedJob, "AI async handler should pass failed jobs to the responder");

  const sendRes = fakeResponse();
  sendAIErrorResponse(sendRes, { status: 418 }, failure, failedJob);
  assert(sendRes.statusCode === 418, "AI error responder should preserve explicit error status");
  assert(sendRes.body.jobId === "job-failed", "AI error responder should include failed job id");
  assert(sendRes.body.failureCode === "BAD_IMAGE", "AI error responder should preserve failure code");
}

function assertAIJobLogPayloads() {
  const imageDataUrl = "data:image/png;base64,QUJDRA==";
  const requestLog = buildGenerationRequestLog({
    route: "/api/ai/generate",
    requestId: "req-1",
    modelConfig: {
      id: "gpt-image-2",
      providerId: "apimart",
      providerModel: "gpt-image-2",
      vendor: "apimart"
    },
    type: "video",
    task: "video_generation",
    prompt: "prompt",
    images: [imageDataUrl, "https://example.test/input.png", ""],
    size: "1024x1024",
    videoOptions: { duration: 5 },
    inputAssetIds: ["asset-a", ""],
    quote: { totalCredits: 8, fixedCredits: 8 },
    reservation: { amountCredits: 8 }
  });
  assert(requestLog.imageCount === 3, "Generation request log should preserve the original image count");
  assert(requestLog.images[0].source === "data-url", "Generation request log should summarize data URLs");
  assert(requestLog.images[0].mimeType === "image/png", "Generation request log should keep data URL MIME type");
  assert(!JSON.stringify(requestLog).includes("QUJDRA=="), "Generation request log should not leak base64 image data");
  assert(requestLog.images[1].value === "https://example.test/input.png", "Generation request log should preserve public image URLs");
  assert(requestLog.inputAssetIds.length === 1 && requestLog.inputAssetIds[0] === "asset-a", "Generation request log should filter empty input asset ids");
  assert(requestLog.videoOptions.duration === 5, "Generation request log should keep video options for video jobs");

  const responseLog = buildGenerationResponseLog({
    provider: "apimart",
    model: "gpt-image-2",
    imageUrl: "/uploads/output.png",
    sizeNormalization: {
      requestedSize: "1024x1024",
      normalizedSize: "1024*1024",
      providerSize: "1024*1024",
      providerResolution: "1k",
      changed: true,
      reason: "provider-format"
    }
  }, {
    modelConfig: { id: "gpt-image-2", providerId: "apimart", providerModel: "gpt-image-2" },
    type: "image",
    immediateOutputUrl: "/uploads/output.png"
  });
  assert(responseLog.status === "succeeded", "Generation response log should mark immediate outputs as succeeded");
  assert(responseLog.outputCount === 1, "Generation response log should count immediate outputs");
  assert(responseLog.sizeNormalization.changed === true, "Generation response log should preserve size normalization");

  const tripoTokenLog = buildTripo3DRequestLog({
    route: "/api/ai/3d/image-to-model",
    requestId: "tripo-1",
    modelConfig: { id: "tripo-model", providerModel: "tripo-api" },
    mode: "image",
    imageUrl: "file_token:abcdefghij",
    quote: { totalCredits: 12, unitCredits: 12 },
    reservation: { amountCredits: 12 }
  });
  assert(tripoTokenLog.imageInput.source === "file_token", "Tripo request log should recognize file tokens");
  assert(tripoTokenLog.imageInput.value === "[file_token]", "Tripo request log should not expose file tokens");

  const tripoDataLog = buildTripo3DRequestLog({
    imageDataUrl,
    imageName: "input.png",
    imageMimeType: "image/png"
  });
  assert(tripoDataLog.imageInput.source === "data-url", "Tripo request log should summarize uploaded data URLs");
  assert(!JSON.stringify(tripoDataLog).includes("QUJDRA=="), "Tripo request log should not leak base64 image data");

  const tripoResponseLog = buildTripo3DResponseLog({
    taskId: "remote-1",
    modelUrl: "https://example.test/model.glb",
    renderedImageUrl: "https://example.test/render.png",
    status: "running"
  }, {
    modelConfig: { id: "tripo-model", providerModel: "tripo-api" },
    chargedCredits: 12
  });
  assert(tripoResponseLog.modelUrl === true, "Tripo response log should store model URL presence as a boolean");
  assert(tripoResponseLog.billing.status === "charged", "Tripo response log should record charged billing status");

  const error = errorWith({ status: 502, code: "PROVIDER_FAILED", message: "Provider exploded" });
  const failureLog = buildGenerationFailureLog(error, {
    stage: "provider",
    failureCode: "PROVIDER_FAILED",
    failureMessage: "Provider exploded"
  });
  assert(failureLog.providerStatus === 502, "Generation failure log should keep provider status");
  assert(failureLog.failureCode === "PROVIDER_FAILED", "Generation failure log should keep failure code");
}

function assertAIResponseDtos() {
  const job = {
    id: "job-1",
    modelId: "gpt-image-2",
    providerModel: "gpt-image-2",
    vendor: "apimart",
    type: "image",
    status: "succeeded",
    progress: 100,
    promptPreview: "prompt preview",
    inputAssetIds: ["input-1"],
    outputAssetIds: ["asset-1", "asset-2"],
    remoteTaskId: "remote-1",
    errorCode: "PROVIDER_FAILED",
    errorMessage: "provider exploded",
    creditsReserved: 8,
    creditsCharged: 8,
    createdAt: 1,
    updatedAt: 2,
    completedAt: 3,
    durationMs: 4
  };
  const clientJob = toClientJob(job);
  assert(clientJob.id === "job-1", "Client job DTO should keep the job id");
  assert(clientJob.outputCount === 2, "Client job DTO should derive outputCount from outputAssetIds");
  assert(clientJob.failureCode === "PROVIDER_FAILED", "Client job DTO should fall back to errorCode for failureCode");
  assert(clientJob.failureMessage === "provider exploded", "Client job DTO should fall back to errorMessage for failureMessage");
  assert(toClientJob(null) === null, "Client job DTO should return null for missing jobs");

  const asset = {
    id: "asset-1",
    url: "/uploads/output.png",
    mimeType: "image/png",
    type: "image",
    width: 1024,
    height: 1024,
    duration: 0,
    modelName: "gpt-image-2",
    prompt: "prompt",
    createdAt: 5
  };
  const clientAsset = toClientAsset(asset);
  assert(clientAsset.assetId === "asset-1", "Client asset DTO should expose assetId");
  assert(clientAsset.modelId === "gpt-image-2", "Client asset DTO should expose modelName as modelId");
  assert(toClientAsset(null) === null, "Client asset DTO should return null for missing assets");

  const billing = toClientBilling({
    requestId: "req-1",
    task: "image_generation",
    billingType: "fixed",
    creditsReserved: 8,
    creditsCharged: 8,
    unitCredits: 8,
    count: 1,
    status: "charged"
  });
  assert(billing.status === "charged", "Client billing DTO should keep billing status");
  assert(toClientBilling(null) === undefined, "Client billing DTO should return undefined for missing billing");

  const deferred = buildDeferredImageEditResult({
    taskId: "remote-task",
    imageUrl: "provider-url-should-not-leak"
  }, job, asset, { amountCredits: 8 });
  assert(deferred.deferCharge === true, "Deferred image edit DTO should mark deferCharge");
  assert(deferred.imageUrl === "/uploads/output.png", "Deferred image edit DTO should prefer persisted asset URL");
  assert(deferred.imageUrls.length === 1, "Deferred image edit DTO should expose persisted image URLs");
  assert(deferred.jobId === "job-1", "Deferred image edit DTO should expose jobId");
  assert(deferred.remoteTaskId === "remote-1", "Deferred image edit DTO should prefer job remote task id");
  assert(deferred.billing.status === "charged", "Deferred image edit DTO should mark succeeded jobs as charged");
}

function assertAIRouteHelpers() {
  assert(getInitialAIJobStatus({ imageUrl: "/uploads/image.png" }) === "running", "Immediate image outputs should start as running for local persistence");
  assert(getInitialAIJobStatus({ videoUrl: "/uploads/video.mp4" }) === "running", "Immediate video outputs should start as running for local persistence");
  assert(getInitialAIJobStatus({ status: "succeeded" }) === "running", "Provider succeeded results should start as running for local refresh");
  assert(getInitialAIJobStatus({ status: "FAILED" }) === "failed", "Initial job status should normalize provider status text");
  assert(getInitialAIJobStatus({}) === "queued", "Initial job status should default to queued");

  assert(getModelModality({ modality: "3D", type: "image" }) === "3d", "Model modality should prefer modality over type");
  assert(getModelModality({ type: "video" }) === "video", "Model modality should fall back to type");
  assert(getModelModality({}) === "image", "Model modality should default to image");

  assertTripo3DModelConfig({
    modelId: "tripo-text",
    modelConfig: { id: "tripo-text", providerId: "tripo", modality: "3d", capabilities: { textTo3D: true } },
    mode: "text"
  });
  assertTripo3DModelConfig({
    modelId: "tripo-image",
    modelConfig: { id: "tripo-image", providerId: "tripo", modality: "3d", capabilities: { imageTo3D: true } },
    mode: "image"
  });
  assertThrowsStatusCode(
    () => assertTripo3DModelConfig({ modelId: "missing-model", modelConfig: null, mode: "text" }),
    400,
    "UNSUPPORTED_3D_MODEL",
    "Unsupported 3D model: missing-model",
    "Tripo model guard should reject missing model configs"
  );
  assertThrowsStatusCode(
    () => assertTripo3DModelConfig({
      modelId: "image-model",
      modelConfig: { id: "image-model", providerId: "tripo", type: "image", capabilities: { textTo3D: true } },
      mode: "text"
    }),
    400,
    "UNSUPPORTED_3D_MODEL",
    "Unsupported 3D model: image-model",
    "Tripo model guard should reject non-3D models"
  );
  assertThrowsStatusCode(
    () => assertTripo3DModelConfig({
      modelId: "other-3d",
      modelConfig: { id: "other-3d", providerId: "other", modality: "3d", capabilities: { textTo3D: true } },
      mode: "text"
    }),
    400,
    "UNSUPPORTED_3D_MODEL",
    "Unsupported 3D model: other-3d",
    "Tripo model guard should reject non-Tripo 3D models"
  );
  assertThrowsStatusCode(
    () => assertTripo3DModelConfig({
      modelId: "tripo-image-only",
      modelConfig: { id: "tripo-image-only", label: "Tripo Image Only", providerId: "tripo", modality: "3d", capabilities: { imageTo3D: true } },
      mode: "text"
    }),
    400,
    "TEXT_TO_3D_UNSUPPORTED",
    "Tripo Image Only does not support text to 3D",
    "Tripo model guard should reject text mode without text capability"
  );
  assertThrowsStatusCode(
    () => assertTripo3DModelConfig({
      modelId: "tripo-text-only",
      modelConfig: { id: "tripo-text-only", label: "Tripo Text Only", providerId: "tripo", modality: "3d", capabilities: { textTo3D: true } },
      mode: "image"
    }),
    400,
    "IMAGE_TO_3D_UNSUPPORTED",
    "Tripo Text Only does not support image to 3D",
    "Tripo model guard should reject image mode without image capability"
  );

  assert(isFixedQwenImageEditAction("remove_background") === true, "Fixed Qwen helper should recognize background removal");
  assert(isFixedQwenImageEditAction(" text_edit ") === true, "Fixed Qwen helper should trim action types");
  assert(isFixedQwenImageEditAction("upscale") === false, "Fixed Qwen helper should reject unrelated action types");

  assert(hasRemoteFallbackModelOutput([{ type: "model3d", url: "https://example.test/model.glb" }]) === true, "Remote model output helper should detect remote 3D fallback assets");
  assert(hasRemoteFallbackModelOutput([{ type: "model3d", url: "https://example.test/model.glb", filePath: "/uploads/model.glb" }]) === false, "Remote model output helper should ignore persisted local model assets");
  assert(hasRemoteFallbackModelOutput([{ type: "image", url: "https://example.test/image.png" }]) === false, "Remote model output helper should ignore non-model assets");

  assertResolvedProviderMatchesModel({
    modelConfig: { id: "doubao-seedream", providerId: "volcengine" },
    result: {
      provider: "volcengine",
      providerModel: "doubao-seedream",
      providerCalls: [{ provider: "volcengine", model: "doubao-seedream" }]
    }
  });
  assertResolvedProviderMatchesModel({
    modelConfig: { id: "gpt-image-2", providerId: "apimart" },
    result: {
      provider: "qwen",
      providerModel: "qwen-image-plus",
      providerCalls: [{ provider: "qwen", model: "qwen-image-plus" }]
    }
  });
  assertThrowsStatus(
    () => assertResolvedProviderMatchesModel({
      modelConfig: { id: "doubao-seedream", providerId: "volcengine" },
      result: {
        provider: "qwen",
        providerModel: "qwen-image-plus",
        providerCalls: [{ provider: "qwen", model: "qwen-image-plus" }]
      }
    }),
    500,
    "Doubao model doubao-seedream resolved to an unexpected provider/model: qwen / qwen-image-plus; calls: qwen/qwen-image-plus",
    "Doubao model guard should reject hidden Qwen resolution"
  );

  assert(isValidTripoImageInput("https://example.test/input.png", "") === true, "Tripo image input should accept public URLs");
  assert(isValidTripoImageInput("file_token:abcdefghij", "") === true, "Tripo image input should accept prefixed file tokens");
  assert(isValidTripoImageInput("abcdefghij", "") === true, "Tripo image input should accept bare file tokens");
  assert(isValidTripoImageInput("", "data:image/png;base64,AAAA") === true, "Tripo image input should accept image data URLs");
  assert(isValidTripoImageInput("ftp://example.test/input.png", "") === false, "Tripo image input should reject unsupported URL schemes");

  assertTripo3DRequiredInput({ mode: "text", prompt: "  make a chair  " });
  assertTripo3DRequiredInput({ mode: "image", imageUrl: "file_token:abcdefghij" });
  assertThrowsStatusCode(
    () => assertTripo3DRequiredInput({ mode: "text", prompt: "   " }),
    400,
    "PROMPT_REQUIRED",
    "Missing prompt",
    "Tripo input guard should require prompts for text-to-3D"
  );
  assertThrowsStatusCode(
    () => assertTripo3DRequiredInput({ mode: "image", imageUrl: "ftp://example.test/input.png", imageDataUrl: "" }),
    400,
    "TRIPO_IMAGE_INPUT_REQUIRED",
    "Image-to-3D requires an http/https URL, Tripo file token, or uploaded image data.",
    "Tripo input guard should require valid image input for image-to-3D"
  );

  assertDeepEqual(getTripo3DJobMetadata("text"), {
    task: "tripo_text_to_3d_standard",
    route: "/api/ai/3d/text-to-model"
  }, "Tripo 3D metadata should preserve text-to-model routing");
  assertDeepEqual(getTripo3DJobMetadata("image"), {
    task: "tripo_image_to_3d_standard",
    route: "/api/ai/3d/image-to-model"
  }, "Tripo 3D metadata should preserve image-to-model routing");

  assert(getTripo3DProviderModel({
    id: "model-id",
    apiModel: "api-model",
    providerModel: "provider-model"
  }) === "api-model", "Tripo provider model should prefer apiModel");
  assert(getTripo3DProviderModel({
    id: "model-id",
    providerModel: "provider-model"
  }) === "provider-model", "Tripo provider model should fall back to providerModel");
  assert(getTripo3DProviderModel({
    id: "model-id"
  }) === "model-id", "Tripo provider model should fall back to model id for job records");
  assert(getTripo3DProviderModel({
    id: "model-id"
  }, { fallbackToId: false }) === undefined, "Tripo task API model should preserve missing provider model");

  assertDeepEqual(buildTripo3DDispatchParams({
    mode: "text",
    prompt: "make a chair",
    apiModel: "api-model",
    texture: false,
    defaultParams: { draft: true },
    requestId: "request-1"
  }), {
    prompt: "make a chair",
    apiModel: "api-model",
    texture: false,
    defaultParams: { draft: true },
    requestId: "request-1"
  }, "Tripo text dispatch params should preserve provider input shape");
  assertDeepEqual(buildTripo3DDispatchParams({
    mode: "image",
    imageUrl: "file_token:abcdefghij",
    imageDataUrl: "data:image/png;base64,AAAA",
    imageName: "input.png",
    imageMimeType: "image/png",
    apiModel: "api-model",
    texture: true,
    defaultParams: { draft: true },
    requestId: "request-2"
  }), {
    imageUrl: "file_token:abcdefghij",
    imageDataUrl: "data:image/png;base64,AAAA",
    imageName: "input.png",
    imageMimeType: "image/png",
    apiModel: "api-model",
    texture: true,
    defaultParams: { draft: true },
    requestId: "request-2"
  }, "Tripo image dispatch params should preserve provider input shape");

  assertDeepEqual(buildTripo3DJobRecordParams({
    requestId: "request-3",
    userId: "user-1",
    modelConfig: { id: "tripo-model" },
    providerModel: "api-model",
    prompt: "make a chair",
    creditsReserved: 12,
    requestData: { route: "/api/ai/3d/text-to-model" }
  }), {
    id: "request-3",
    userId: "user-1",
    provider: "tripo",
    vendor: "tripo",
    modelId: "tripo-model",
    providerModel: "api-model",
    remoteTaskId: "",
    type: "model3d",
    status: "queued",
    progress: 0,
    prompt: "make a chair",
    creditsReserved: 12,
    requestData: { route: "/api/ai/3d/text-to-model" }
  }, "Tripo job record params should preserve createAIJob fields");
  assert(buildTripo3DJobRecordParams({
    prompt: "",
    modelConfig: { id: "tripo-model" }
  }).prompt === "Image to 3D", "Tripo job record params should preserve image prompt fallback");

  assertDeepEqual(buildTripo3DRequestLogParams({
    route: "/api/ai/3d/image-to-model",
    requestId: "request-log-1",
    modelConfig: { id: "tripo-model", apiModel: "api-model" },
    mode: "image",
    prompt: "make a chair",
    imageUrl: "file_token:abcdefghij",
    imageDataUrl: "data:image/png;base64,AAAA",
    imageName: "input.png",
    imageMimeType: "image/png",
    texture: false,
    task: "tripo_image_to_3d_standard",
    quote: { totalCredits: 12 },
    reservation: { amountCredits: 12 }
  }), {
    route: "/api/ai/3d/image-to-model",
    requestId: "request-log-1",
    modelConfig: { id: "tripo-model", apiModel: "api-model" },
    mode: "image",
    prompt: "make a chair",
    imageUrl: "file_token:abcdefghij",
    imageDataUrl: "data:image/png;base64,AAAA",
    imageName: "input.png",
    imageMimeType: "image/png",
    texture: false,
    task: "tripo_image_to_3d_standard",
    quote: { totalCredits: 12 },
    reservation: { amountCredits: 12 }
  }, "Tripo request log params should preserve request log input shape");

  assertDeepEqual(buildTripo3DDispatchResultParams({
    taskCreated: {
      taskId: "task-1",
      providerModel: "provider-returned-model",
      status: "running"
    },
    providerModel: "fallback-model",
    responseData: { status: "created" }
  }), {
    remoteTaskId: "task-1",
    providerModel: "provider-returned-model",
    status: "running",
    progress: 10,
    responseData: { status: "created" }
  }, "Tripo dispatch result params should preserve running provider updates");
  assertDeepEqual(buildTripo3DDispatchResultParams({
    taskCreated: {
      taskId: "task-2",
      status: "queued"
    },
    providerModel: "fallback-model",
    responseData: { status: "created" }
  }), {
    remoteTaskId: "task-2",
    providerModel: "fallback-model",
    status: "queued",
    progress: 0,
    responseData: { status: "created" }
  }, "Tripo dispatch result params should preserve queued fallback updates");

  assertDeepEqual(buildTripo3DQuoteParams({
    modelConfig: { id: "tripo-model" },
    task: "tripo_text_to_3d_standard"
  }), {
    provider: "tripo",
    model: "tripo-model",
    task: "tripo_text_to_3d_standard",
    count: 1
  }, "Tripo quote params should preserve fixed pricing fields");

  assertDeepEqual(buildTripo3DReserveCreditsParams({
    userId: "user-1",
    quote: { totalCredits: 12 },
    modelConfig: { id: "tripo-model" },
    task: "tripo_text_to_3d_standard",
    requestId: "request-3"
  }), {
    userId: "user-1",
    amount: 12,
    provider: "tripo",
    model: "tripo-model",
    task: "tripo_text_to_3d_standard",
    billingType: "fixed",
    reason: "tripo_text_to_3d_standard",
    requestId: "request-3"
  }, "Tripo reserve credits params should preserve fixed billing fields");

  assertDeepEqual(buildTripo3DChargeReservationParams({
    userId: "user-1",
    reservation: { amountCredits: 12 },
    modelConfig: { id: "tripo-model" },
    task: "tripo_text_to_3d_standard",
    requestId: "request-3",
    job: { id: "job-3" }
  }), {
    userId: "user-1",
    reservedAmount: 12,
    chargeAmount: 12,
    provider: "tripo",
    model: "tripo-model",
    task: "tripo_text_to_3d_standard",
    billingType: "fixed",
    reason: "tripo_task_created",
    requestId: "request-3",
    aiJobId: "job-3"
  }, "Tripo charge reservation params should preserve fixed billing fields");

  assertDeepEqual(buildTripo3DSuccessResponse({
    taskCreated: { taskId: "task-3", status: "running" },
    job: { id: "job-3" },
    creditsReserved: 12,
    creditsCharged: 12
  }), {
    ok: true,
    provider: "tripo",
    taskId: "task-3",
    jobId: "job-3",
    status: "queued",
    billing: {
      creditsReserved: 12,
      creditsCharged: 12,
      status: "charged"
    }
  }, "Tripo success response should preserve client response shape");

  assertDeepEqual(buildTripo3DReleaseReservationParams({
    userId: "user-1",
    reservation: { amountCredits: 12 },
    modelConfig: { id: "tripo-model" },
    task: "tripo_text_to_3d_standard",
    error: { message: "provider failed" },
    requestId: "request-4",
    job: { id: "job-4" }
  }), {
    userId: "user-1",
    amount: 12,
    provider: "tripo",
    model: "tripo-model",
    task: "tripo_text_to_3d_standard",
    billingType: "fixed",
    reason: "provider failed",
    requestId: "request-4",
    aiJobId: "job-4",
    status: "failed"
  }, "Tripo release reservation params should preserve failure refund fields");
  assertDeepEqual(buildTripo3DReleaseReservationParams({
    reservation: { amountCredits: 8 },
    modelConfig: { id: "tripo-model" },
    error: {},
    job: null
  }), {
    userId: "",
    amount: 8,
    provider: "tripo",
    model: "tripo-model",
    task: "",
    billingType: "fixed",
    reason: "tripo_task_create_failed",
    requestId: "",
    aiJobId: "",
    status: "failed"
  }, "Tripo release reservation params should preserve default failure fallbacks");

  assertDeepEqual(buildTripo3DFailJobParams({
    error: {
      code: "TRIPO_DOWN",
      message: "provider failed",
      providerPayload: { reason: "downstream" }
    },
    taskCreated: null,
    startedAt: 1000,
    chargedCredits: 0,
    now: 1250
  }), {
    status: "failed",
    errorCode: "TRIPO_DOWN",
    errorMessage: "provider failed",
    responseData: {
      status: "failed",
      stage: "task_create",
      provider: "tripo",
      providerPayload: { reason: "downstream" }
    },
    durationMs: 250,
    refundTodo: false
  }, "Tripo fail job params should preserve task-create failure fields");
  assertDeepEqual(buildTripo3DFailJobParams({
    error: {},
    taskCreated: { taskId: "task-1" },
    startedAt: 1000,
    chargedCredits: 12,
    now: 1300
  }), {
    status: "failed",
    errorCode: "TRIPO_TASK_CREATE_FAILED",
    errorMessage: "Tripo task creation failed",
    responseData: {
      status: "failed",
      stage: "charge",
      provider: "tripo"
    },
    durationMs: 300,
    refundTodo: true
  }, "Tripo fail job params should preserve charge failure fallbacks");

  assertDeepEqual(buildTripo3DRemoteFailureParams({
    remote: {
      status: "banned",
      errorCode: "POLICY_BLOCKED",
      errorMessage: "provider policy blocked"
    },
    responseData: { provider: "tripo" },
    startedAt: 1000,
    now: 1500
  }), {
    status: "failed",
    errorCode: "POLICY_BLOCKED",
    errorMessage: "provider policy blocked",
    responseData: { provider: "tripo" },
    durationMs: 500,
    refundTodo: true
  }, "Tripo remote failure params should preserve banned-to-failed mapping");
  assertDeepEqual(buildTripo3DRemoteFailureParams({
    remote: { status: "cancelled" },
    responseData: { provider: "tripo" },
    startedAt: 1000,
    now: 1600
  }), {
    status: "cancelled",
    errorCode: "cancelled",
    errorMessage: "Tripo task cancelled",
    responseData: { provider: "tripo" },
    durationMs: 600,
    refundTodo: true
  }, "Tripo remote failure params should preserve status fallback fields");

  const text3DInput = normalizeTripo3DJobInput({
    prompt: "  make a chair  ",
    texture: false,
    imageUrl: "https://example.test/ignored.png"
  }, { mode: "text" });
  assert(text3DInput.mode === "text", "Tripo 3D text input should preserve text mode");
  assert(text3DInput.prompt === "make a chair", "Tripo 3D text input should trim prompts");
  assert(text3DInput.imageUrl === "", "Tripo 3D text input should ignore image URL aliases");
  assert(text3DInput.texture === false, "Tripo 3D input should preserve explicit texture false");

  const image3DInput = normalizeTripo3DJobInput({
    image_url: "  file_token:abcdefghij  ",
    dataUrl: "  data:image/png;base64,AAAA  ",
    filename: "  input.png  ",
    mimeType: "  image/png  "
  }, { mode: "image" });
  assert(image3DInput.mode === "image", "Tripo 3D image input should preserve image mode");
  assert(image3DInput.imageUrl === "file_token:abcdefghij", "Tripo 3D image input should normalize image_url aliases");
  assert(image3DInput.imageDataUrl === "data:image/png;base64,AAAA", "Tripo 3D image input should normalize data URL aliases");
  assert(image3DInput.imageName === "input.png", "Tripo 3D image input should normalize filename aliases");
  assert(image3DInput.imageMimeType === "image/png", "Tripo 3D image input should normalize MIME type aliases");
  assert(image3DInput.texture === true, "Tripo 3D input should default texture to true");

  assert(jobStatusForError(errorWith({ message: "Provider timed out" })) === "timeout", "Timeout errors should map to timeout job status");
  assert(jobStatusForError(errorWith({ message: "output could not be saved" })) === "save_failed", "Output save errors should map to save_failed job status");
  assert(jobStatusForError(errorWith({ message: "provider failed" })) === "failed", "Generic errors should map to failed job status");

  const normalizedImages = normalizeImages(["a", "", null, "b"]);
  assert(normalizedImages.length === 2 && normalizedImages[0] === "a" && normalizedImages[1] === "b", "Image normalization should filter falsy image entries");
  assert(normalizeImages("not-array").length === 0, "Image normalization should reject non-array input");
}

function assertAIRouteLogging() {
  const entries = [];
  const logger = (message, detail) => entries.push({ message, detail });

  logAIModelRoute({
    route: "/api/ai/generate",
    requestedModel: "gpt-image-2",
    provider: "apimart",
    providerModel: "gpt-image-2",
    remoteTaskId: "remote-1",
    type: "image",
    referenceCount: "2"
  }, { nodeEnv: "development", logger });
  assert(entries.length === 1, "AI route logging should emit in development");
  assert(entries[0].message === "AI model route", "AI route logging should use the existing log message");
  assertDeepEqual(entries[0].detail, {
    route: "/api/ai/generate",
    requestedModel: "gpt-image-2",
    provider: "apimart",
    providerModel: "gpt-image-2",
    remoteTaskId: "remote-1",
    type: "image",
    referenceCount: 2
  }, "AI route logging should preserve the model route payload");

  logAIModelRoute({ route: "/api/ai/generate" }, { nodeEnv: "test", logger });
  assert(entries.length === 1, "AI route logging should remain silent outside development");

  logAIProviderRoute({
    requestedModel: "qwen-image-plus",
    provider: "qwen",
    providerModel: "qwen-image-plus",
    referenceCount: 3
  }, { nodeEnv: "development", logger });
  assert(entries.length === 2, "AI provider route logging should delegate to model route logging");
  assertDeepEqual(entries[1].detail, {
    route: "/api/chat",
    requestedModel: "qwen-image-plus",
    provider: "qwen",
    providerModel: "qwen-image-plus",
    remoteTaskId: "",
    type: "image",
    referenceCount: 3
  }, "AI provider route logging should preserve the chat route payload");
}

function assertGenerationTransformHelpers() {
  const videoModel = {
    id: "seedance-2",
    label: "Seedance",
    allowedOptions: {
      duration: [5, 10],
      size: ["16:9", "9:16"],
      generate_audio: []
    }
  };
  const videoOptions = validateVideoOptions(videoModel, {
    duration: 5,
    size: "16:9",
    generate_audio: false
  });
  assert(videoOptions.duration === 5, "Video option validation should keep allowed duration");
  assert(videoOptions.size === "16:9", "Video option validation should keep allowed size");
  assert(videoOptions.generate_audio === false, "Video option validation should keep open-ended boolean options");
  assertThrowsStatus(
    () => validateVideoOptions(videoModel, { resolution: "720p" }),
    400,
    "Unsupported video option: resolution",
    "Video option validation should reject unsupported option keys"
  );
  assertThrowsStatus(
    () => validateVideoOptions(videoModel, { duration: 7 }),
    400,
    "Unsupported duration for Seedance",
    "Video option validation should reject unsupported option values"
  );

  const sanitized = sanitizeGenerationResult({
    imageUrl: "/uploads/generated.png",
    requestedModel: "gpt-image-2",
    model: "provider-model",
    resolvedModel: "resolved-model",
    referenceCount: 2,
    sizeNormalization: {
      requestedSize: "1024x1024",
      normalizedSize: "1024*1024",
      providerSize: "1024*1024",
      changed: true
    },
    billing: {
      requestId: "req-1",
      task: "image_generation",
      billingType: "fixed",
      creditsReserved: 8,
      creditsCharged: 8,
      unitCredits: 8,
      count: 1,
      status: "charged"
    }
  }, {
    id: "fallback-model"
  });
  assert(sanitized.message === "Image generated", "Sanitized generation response should report generated images");
  assert(sanitized.model === "gpt-image-2", "Sanitized generation response should prefer requestedModel");
  assert(sanitized.resolvedModel === "resolved-model", "Sanitized generation response should keep resolved model");
  assert(sanitized.sizeNormalization.changed === true, "Sanitized generation response should map size normalization");
  assert(sanitized.billing.status === "charged", "Sanitized generation response should map billing");

  const missingImage = sanitizeGenerationResult({ model: "provider-model" }, { id: "fallback-model" });
  assert(missingImage.message === "Model returned without an image URL", "Sanitized generation response should report missing image URLs");
  assert(missingImage.model === "fallback-model", "Sanitized generation response should fall back to model config id");
}

function assertThrowsStatus(fn, status, message, label) {
  try {
    fn();
  } catch (error) {
    assert(error.status === status, `${label}: expected status ${status}, got ${error.status}`);
    assert(error.message === message, `${label}: expected message "${message}", got "${error.message}"`);
    return;
  }
  throw new Error(`${label}: expected an error`);
}

function assertThrowsStatusCode(fn, status, code, message, label) {
  try {
    fn();
  } catch (error) {
    assert(error.status === status, `${label}: expected status ${status}, got ${error.status}`);
    assert(error.code === code, `${label}: expected code ${code}, got ${error.code}`);
    assert(error.message === message, `${label}: expected message "${message}", got "${error.message}"`);
    return;
  }
  throw new Error(`${label}: expected an error`);
}

function errorWith({ status, code, message } = {}) {
  const error = new Error(message);
  if (status !== undefined) error.status = status;
  if (code !== undefined) error.code = code;
  return error;
}

function assertDeepEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertNoInlineMessageErrorResponses() {
  const routesRoot = join(process.cwd(), "src", "server", "routes");
  const offenders = [];
  for (const filePath of listJavaScriptFiles(routesRoot)) {
    const source = readFileSync(filePath, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/res\.status\([^\n]+\)\.json\(\{\s*message\s*:/.test(line)) {
        offenders.push(`${filePath}:${index + 1}`);
      }
    });
  }

  assert(
    offenders.length === 0,
    [
      "Route error responses should use sendErrorResponse/sendCaughtErrorResponse instead of inline { message } JSON.",
      ...offenders
    ].join("\n")
  );
}

function listJavaScriptFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }
  return files;
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });
}

async function register(baseUrl, email, name) {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email,
      password: "password123",
      name
    }
  });
  assert(response.status === 201, `${email} registration should succeed`);
  assert(response.cookie, `${email} registration should set a session cookie`);
  return {
    user: response.body.user,
    cookie: response.cookie
  };
}

async function request(baseUrl, path, {
  method = "GET",
  cookie = "",
  body
} = {}) {
  const headers = {};
  let requestBody = undefined;

  if (cookie) headers.cookie = cookie;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: requestBody
  });
  const text = await response.text();
  const setCookies = response.headers.getSetCookie?.() || [];
  const setCookie = setCookies[0] || response.headers.get("set-cookie") || "";
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    cookie: setCookie.split(";")[0],
    body: parsed
  };
}

function fakeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function suppressAuditLogs() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => {
    if (String(args[0] || "").startsWith("[info] audit:")) return;
    originalLog(...args);
  };
  console.warn = (...args) => {
    if (String(args[0] || "").startsWith("[warn] audit:")) return;
    originalWarn(...args);
  };
  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
  };
}
