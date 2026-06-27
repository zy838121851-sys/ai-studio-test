import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const generatorWorkflow = read("src/client/features/canvas/workflows/image-generator-workflow.js");
assert(
  generatorWorkflow.includes("onJobCreated") && generatorWorkflow.includes("tagGeneratorPreviewJobs"),
  "generator must tag preview nodes with job ids when async jobs are created"
);
assert(
  generatorWorkflow.includes("resumePendingGeneratorPreviews") &&
  generatorWorkflow.includes("visibilitychange") &&
  generatorWorkflow.includes("focus"),
  "generator must resume pending preview jobs on focus and visibility restore"
);
assert(
  generatorWorkflow.includes("missingUrlRetries") &&
  generatorWorkflow.includes("Waiting for saved image URL"),
  "generator polling must retry succeeded jobs that do not yet expose an image URL"
);
assert(
  generatorWorkflow.includes("logGeneratorJobPoll") &&
  generatorWorkflow.includes("[generator] job poll"),
  "generator polling must emit local diagnostic logs"
);
assert(
  generatorWorkflow.includes("getMissingGeneratorResultMessage(lastPayload)"),
  "generator polling must fail clearly when a terminal job has no image URL"
);

const aiRoutes = read("src/server/routes/ai.routes.js");
assert(
  aiRoutes.includes("remoteTaskId: job.remoteTaskId") &&
  aiRoutes.includes("updatedAt: job.updatedAt") &&
  aiRoutes.includes("outputCount: assets.length"),
  "job polling API must expose remoteTaskId, updatedAt, and outputCount diagnostics"
);
assert(
  aiRoutes.includes("scheduleAIJobRefresh(req.auth.user.id, job.id)"),
  "async APIMart jobs must schedule a backend refresh fallback"
);

const aiJobService = read("src/server/services/ai-job.service.js");
assert(
  aiJobService.includes("export function scheduleAIJobRefresh") &&
  aiJobService.includes("runScheduledAIJobRefresh"),
  "AI job service must provide scheduled refresh fallback"
);
assert(
  aiJobService.includes('status === "save_failed" && shouldCompleteMissingOutputs(job)'),
  "save_failed must be able to replace succeeded jobs that have no saved outputs"
);

const appInit = read("src/client/core/app-init.js");
assert(
  appInit.includes("[runtime] AI Studio client") &&
  appInit.includes("generator-job-poll-20260627"),
  "client startup must log runtime origin and build id"
);

console.log("Generator job recovery checks passed.");
