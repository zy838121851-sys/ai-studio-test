export function buildDeferredImageEditResult(result = {}, job = {}, firstAsset = null, reservation = {}) {
  const imageAssets = firstAsset?.type === "image" ? [firstAsset] : [];
  return {
    ...result,
    imageUrl: firstAsset?.type === "image" ? firstAsset.url : "",
    imageUrls: imageAssets.map((asset) => asset.url),
    outputs: imageAssets.map(toClientAsset),
    asset: toClientAsset(firstAsset),
    job: toClientJob(job),
    jobId: job?.id || "",
    remoteTaskId: job?.remoteTaskId || result.remoteTaskId || result.taskId || "",
    status: job?.status || result.status || "",
    outputCount: imageAssets.length,
    deferCharge: true,
    billing: {
      creditsReserved: reservation.amountCredits || job?.creditsReserved || 0,
      creditsCharged: job?.creditsCharged || 0,
      status: job?.status === "succeeded" ? "charged" : (job?.status || "reserved")
    }
  };
}

export function toClientJob(job = {}) {
  if (!job) return null;
  return {
    id: job.id,
    modelId: job.modelId,
    providerModel: job.providerModel || "",
    vendor: job.vendor,
    type: job.type,
    status: job.status,
    progress: job.progress,
    promptPreview: job.promptPreview,
    inputAssetIds: job.inputAssetIds || [],
    outputAssetIds: job.outputAssetIds || [],
    outputCount: Array.isArray(job.outputAssetIds) ? job.outputAssetIds.length : 0,
    remoteTaskId: job.remoteTaskId || "",
    errorCode: job.errorCode || "",
    errorMessage: job.errorMessage || "",
    failureCode: job.failureCode || job.errorCode || "",
    failureMessage: job.failureMessage || job.errorMessage || "",
    creditsReserved: job.creditsReserved || 0,
    creditsCharged: job.creditsCharged || 0,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    durationMs: job.durationMs ?? null
  };
}

export function toClientAsset(asset = {}) {
  if (!asset) return null;
  return {
    assetId: asset.id,
    url: asset.url,
    mimeType: asset.mimeType,
    type: asset.type,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    modelId: asset.modelName,
    prompt: asset.prompt,
    createdAt: asset.createdAt
  };
}

export function toClientBilling(billing = null) {
  if (!billing) return undefined;
  return {
    requestId: billing.requestId,
    task: billing.task,
    billingType: billing.billingType,
    creditsReserved: billing.creditsReserved || 0,
    creditsCharged: billing.creditsCharged || 0,
    unitCredits: billing.unitCredits,
    count: billing.count,
    status: billing.status
  };
}
