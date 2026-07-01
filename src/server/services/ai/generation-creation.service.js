import {
  buildGenerationFailureLog,
  buildGenerationRequestLog,
  buildGenerationResponseLog
} from "../../lib/ai-job-log-payload.js";
import { classifyAIError, toClientFailure } from "../../lib/ai-error-response.js";
import {
  buildCompletedGenerationResponse,
  buildQueuedGenerationResponse,
  buildRefreshedGenerationResponse,
  toClientJob
} from "../../lib/ai-response-dto.js";
import {
  buildGenerationCompleteJobParams,
  buildGenerationDispatchResultParams,
  buildGenerationJobRecordParams,
  buildGenerationReleaseReservationParams,
  buildGenerationReserveCreditsParams,
  jobStatusForError,
  normalizeImages,
  validateVideoOptions
} from "../../lib/ai-route-helpers.js";
import { logAIModelRoute } from "../../lib/ai-route-logging.js";
import { generateImage, generateVideo } from "../ai.service.js";
import {
  completeAIJob,
  createAIJob,
  failAIJob,
  refreshAIJob,
  scheduleAIJobRefresh,
  updateAIJobDispatchResult
} from "../ai-job.service.js";
import { getAsset } from "../asset.service.js";
import {
  releaseReservedCredits,
  reserveCredits
} from "../credits/credit.service.js";
import { quoteFixedCredits } from "../credits/pricing.service.js";
import { randomUUID } from "node:crypto";

export async function createGenerationJob({
  userId = "",
  body = {},
  modelConfig = {},
  path = "/ai/generate"
} = {}) {
  const prompt = String(body?.prompt || "").trim();
  const images = normalizeImages(body?.images);
  if (!prompt && !images.length) {
    const error = new Error("Missing prompt or reference image");
    error.status = 400;
    throw error;
  }

  const type = modelConfig.type === "video" ? "video" : "image";
  const task = type === "video" ? "video_generation" : "image_generation";
  const requestId = randomUUID();
  const videoOptions = type === "video"
    ? validateVideoOptions(modelConfig, body?.videoOptions || {})
    : {};
  const quote = quoteFixedCredits({
    provider: modelConfig.providerId,
    model: modelConfig.id,
    task,
    count: 1
  });
  const startedAt = Date.now();
  let reservation = null;
  let job = null;

  try {
    reservation = reserveCredits(buildGenerationReserveCreditsParams({
      userId,
      quote,
      modelConfig,
      task,
      requestId
    }));
    job = createAIJob(buildGenerationJobRecordParams({
      requestId,
      userId,
      modelConfig,
      type,
      prompt,
      inputAssetIds: body?.inputAssetIds || [],
      creditsReserved: reservation.amountCredits,
      requestData: buildGenerationRequestLog({
        route: "/api/ai/generate",
        requestId,
        modelConfig,
        type,
        task,
        prompt,
        images,
        size: body?.size,
        videoOptions,
        inputAssetIds: body?.inputAssetIds || [],
        quote,
        reservation
      })
    }));
    const result = type === "video"
      ? await generateVideo({
        model: modelConfig.id,
        prompt,
        images,
        videoOptions,
        requestId
      })
      : await generateImage({
        model: modelConfig.id,
        prompt,
        images,
        size: body?.size,
        requestId
      });
    logAIModelRoute({
      route: "/api/ai/generate",
      requestedModel: modelConfig.id,
      providerModel: result.providerModel || result.resolvedModel || result.model || modelConfig.providerModel,
      remoteTaskId: result.remoteTaskId || result.taskId || "",
      type,
      referenceCount: images.length
    });
    const immediateOutputUrl = type === "video"
      ? (result.videoUrl || result.imageUrl || "")
      : (result.imageUrl || "");
    const responseLog = buildGenerationResponseLog(result, {
      modelConfig,
      type,
      immediateOutputUrl
    });
    job = updateAIJobDispatchResult(userId, job.id, buildGenerationDispatchResultParams({
      result,
      modelConfig,
      immediateOutputUrl,
      responseData: responseLog
    }));
    if (immediateOutputUrl) {
      const completed = await completeAIJob(userId, job.id, buildGenerationCompleteJobParams({
        immediateOutputUrl,
        type,
        responseData: responseLog,
        startedAt
      }));
      if (completed?.status !== "succeeded") {
        const failure = toClientFailure(completed, "OUTPUT_SAVE_FAILED");
        return {
          status: 500,
          body: {
            message: failure.failureMessage || "Generated output could not be saved locally",
            ...failure,
            job: toClientJob(completed),
            jobId: completed?.id,
            model: modelConfig.id
          }
        };
      }
      const firstAsset = completed?.outputAssetIds?.[0]
        ? getAsset(userId, completed.outputAssetIds[0])
        : null;
      return {
        body: buildCompletedGenerationResponse({
          type,
          completed,
          firstAsset,
          modelConfig,
          result,
          reservation
        })
      };
    }
    scheduleAIJobRefresh(userId, job.id);
    if (result.status === "succeeded") {
      const completed = await refreshAIJob(userId, job.id);
      return {
        body: buildRefreshedGenerationResponse({
          completed,
          modelConfig,
          result
        })
      };
    }
    return {
      body: buildQueuedGenerationResponse({
        job,
        modelConfig,
        result,
        reservation
      })
    };
  } catch (error) {
    const failure = classifyAIError(error, { path });
    if (job?.id) {
      error.aiJob = failAIJob(userId, job.id, {
        status: jobStatusForError(error),
        errorCode: error?.code || failure.failureCode,
        errorMessage: failure.failureMessage,
        responseData: buildGenerationFailureLog(error, failure),
        durationMs: Date.now() - startedAt
      });
    } else if (reservation?.amountCredits) {
      releaseReservedCredits(buildGenerationReleaseReservationParams({
        userId,
        reservation,
        modelConfig,
        task,
        requestId,
        error
      }));
    }
    throw error;
  }
}
