import {
  toClientAsset,
  toClientJob
} from "../../lib/ai-response-dto.js";
import {
  getAIJobDetails,
  getAIJobOutputAssets,
  listAIJobs,
  refreshAIJob
} from "../ai-job.service.js";

export function listAIJobSummaries({
  userId = "",
  query = {}
} = {}) {
  const result = listAIJobs(userId, {
    limit: query.limit,
    offset: query.offset,
    q: query.q,
    type: query.type,
    status: query.status,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo
  });
  return {
    body: {
      ...result,
      serverTime: Date.now()
    }
  };
}

export async function getAIJobDetailResponse({
  userId = "",
  jobId = ""
} = {}) {
  const refreshed = await refreshAIJob(userId, jobId);
  if (!refreshed) {
    return {
      status: 404,
      message: "Job not found"
    };
  }
  const job = getAIJobDetails(userId, jobId) || refreshed;
  const assets = getAIJobOutputAssets(userId, job);
  const firstAsset = assets[0] || null;
  return {
    body: {
      job: toClientJob(job),
      jobId: job.id,
      remoteTaskId: job.remoteTaskId || "",
      status: job.status,
      progress: job.progress,
      updatedAt: job.updatedAt,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      durationMs: job.durationMs,
      outputCount: assets.length,
      outputs: assets.map(toClientAsset),
      imageUrls: assets.filter((asset) => asset.type === "image").map((asset) => asset.url),
      videoUrls: assets.filter((asset) => asset.type === "video").map((asset) => asset.url),
      imageUrl: firstAsset?.type === "image" ? firstAsset.url : "",
      videoUrl: firstAsset?.type === "video" ? firstAsset.url : "",
      error: job.failureMessage || job.errorMessage || "",
      errorCode: job.errorCode || "",
      errorMessage: job.errorMessage || "",
      failureCode: job.failureCode || job.errorCode || "",
      failureMessage: job.failureMessage || job.errorMessage || "",
      requestData: job.requestData || {},
      responseData: job.responseData || {},
      billing: {
        creditsReserved: job.creditsReserved || 0,
        creditsCharged: job.creditsCharged || 0,
        status: job.status === "succeeded" ? "charged" : job.status
      }
    }
  };
}
