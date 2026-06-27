import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const aiRoutes = read("src/server/routes/ai.routes.js");
const imageEditActions = read("src/client/features/ai/image-edit-actions.js");
const apimartTaskCheck = read("scripts/check-apimart-task-output.js");

assert(
  aiRoutes.includes("callProvider: async ({ reservation, requestId })") &&
    aiRoutes.includes("const remoteTaskId = editResult.remoteTaskId || editResult.taskId"),
  "image-edit APIMart branch must create a deferred local job from remoteTaskId"
);

assert(
  aiRoutes.includes("scheduleAIJobRefresh(req.auth.user.id, job.id)") &&
    aiRoutes.includes("buildDeferredImageEditResult(editResult, job, null, reservation)"),
  "image-edit APIMart jobs must schedule background refresh and return job metadata"
);

assert(
  aiRoutes.includes("outputs: result.outputs || []") &&
    aiRoutes.includes("outputCount: result.outputCount || 0") &&
    aiRoutes.includes("remoteTaskId: result.remoteTaskId || result.taskId || \"\""),
  "image-edit response must expose outputs, outputCount, and remoteTaskId diagnostics"
);

assert(
  imageEditActions.includes("getPrimaryResultImageUrl(result)") &&
    imageEditActions.includes("getResultImageUrls(lastPayload)") &&
    imageEditActions.includes("missingUrlRetries = 4"),
  "image-edit frontend must consume imageUrl/imageUrls/outputs and retry terminal jobs without URLs"
);

assert(
  imageEditActions.includes("console.debug(\"[image-edit] job poll\"") &&
    imageEditActions.includes("getMissingImageEditResultMessage(lastPayload)"),
  "image-edit frontend must log job polls and fail clearly when URLs are missing"
);

assert(
  apimartTaskCheck.includes("result bare url string") &&
    apimartTaskCheck.includes("https://getapib.org/image/task-result.png"),
  "APIMart task checks must cover data.result as a bare URL string"
);

console.log("Image edit job output checks passed.");
