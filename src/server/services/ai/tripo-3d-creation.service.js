import { randomUUID } from "node:crypto";
import {
  buildTripo3DRequestLog,
  buildTripo3DResponseLog
} from "../../lib/ai-job-log-payload.js";
import {
  assertTripo3DModelConfig,
  assertTripo3DRequiredInput,
  buildTripo3DChargeReservationParams,
  buildTripo3DCreateContext,
  buildTripo3DDispatchResultParams,
  buildTripo3DFailJobParams,
  buildTripo3DJobRecordParams,
  buildTripo3DReleaseReservationParams,
  buildTripo3DRequestLogParams,
  buildTripo3DResponseLogParams,
  buildTripo3DReserveCreditsParams,
  buildTripo3DSuccessResponse,
  runTripo3DDispatch
} from "../../lib/ai-route-helpers.js";
import {
  createAIJob,
  failModel3DJob,
  markAIJobCreditsCharged,
  updateAIJobDispatchResult
} from "../ai-job.service.js";
import {
  chargeReservedCredits,
  releaseReservedCredits,
  reserveCredits
} from "../credits/credit.service.js";
import { quoteFixedCredits } from "../credits/pricing.service.js";
import {
  DEFAULT_3D_MODEL,
  getModelConfig
} from "../model-catalog.service.js";
import {
  createImageToModelTask,
  createTextToModelTask
} from "./providers/tripo.service.js";

export async function createTripo3DJob({
  userId = "",
  body = {},
  input = {}
} = {}) {
  const {
    mode = "text",
    prompt = "",
    imageUrl = "",
    imageDataUrl = "",
    imageName = "",
    imageMimeType = "",
    texture = true
  } = input;
  const modelId = String(body?.modelId || body?.model || DEFAULT_3D_MODEL).trim() || DEFAULT_3D_MODEL;
  const modelConfig = getModelConfig(modelId);
  assertTripo3DModelConfig({ modelId, modelConfig, mode });
  const cleanPrompt = String(prompt || "").trim();
  const cleanImageUrl = String(imageUrl || "").trim();
  const cleanImageDataUrl = String(imageDataUrl || "").trim();
  const cleanImageName = String(imageName || "").trim();
  const cleanImageMimeType = String(imageMimeType || "").trim();
  assertTripo3DRequiredInput({
    mode,
    prompt: cleanPrompt,
    imageUrl: cleanImageUrl,
    imageDataUrl: cleanImageDataUrl
  });

  const requestId = randomUUID();
  const startedAt = Date.now();
  const {
    task,
    route,
    providerModel,
    taskApiModel,
    quoteParams
  } = buildTripo3DCreateContext({
    mode,
    modelConfig
  });
  const quote = quoteFixedCredits(quoteParams);
  const reservation = reserveCredits(buildTripo3DReserveCreditsParams({
    userId,
    quote,
    modelConfig,
    task,
    requestId
  }));
  let job = createAIJob(buildTripo3DJobRecordParams({
    requestId,
    userId,
    modelConfig,
    providerModel,
    prompt: cleanPrompt,
    creditsReserved: reservation.amountCredits,
    requestData: buildTripo3DRequestLog(buildTripo3DRequestLogParams({
      route,
      requestId,
      modelConfig,
      mode,
      prompt: cleanPrompt,
      imageUrl: cleanImageUrl,
      imageDataUrl: cleanImageDataUrl,
      imageName: cleanImageName,
      imageMimeType: cleanImageMimeType,
      texture,
      task,
      quote,
      reservation
    }))
  }));
  let taskCreated = null;
  let chargedCredits = 0;
  try {
    taskCreated = await runTripo3DDispatch({
      mode,
      prompt: cleanPrompt,
      imageUrl: cleanImageUrl,
      imageDataUrl: cleanImageDataUrl,
      imageName: cleanImageName,
      imageMimeType: cleanImageMimeType,
      apiModel: taskApiModel,
      texture,
      defaultParams: modelConfig.defaultParams || {},
      requestId,
      createImageToModelTask,
      createTextToModelTask
    });
    const charge = chargeReservedCredits(buildTripo3DChargeReservationParams({
      userId,
      reservation,
      modelConfig,
      task,
      requestId,
      job
    }));
    chargedCredits = charge.chargedCredits || 0;
    markAIJobCreditsCharged(userId, job.id, chargedCredits);
    job = updateAIJobDispatchResult(userId, job.id, buildTripo3DDispatchResultParams({
      taskCreated,
      providerModel,
      responseData: buildTripo3DResponseLog(taskCreated, buildTripo3DResponseLogParams({
        taskCreated,
        modelConfig,
        mode,
        chargedCredits
      }))
    }));
    return buildTripo3DSuccessResponse({
      taskCreated,
      job,
      creditsReserved: reservation.amountCredits,
      creditsCharged: chargedCredits
    });
  } catch (error) {
    if (!chargedCredits && reservation?.amountCredits) {
      releaseReservedCredits(buildTripo3DReleaseReservationParams({
        userId,
        reservation,
        modelConfig,
        task,
        error,
        requestId,
        job
      }));
    }
    if (job?.id) {
      failModel3DJob(userId, job.id, buildTripo3DFailJobParams({
        error,
        taskCreated,
        startedAt,
        chargedCredits
      }));
    }
    throw error;
  }
}
