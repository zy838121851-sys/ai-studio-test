import {
  getGeneratorBatchCount,
  isMidjourneyGeneratorModel
} from "./image-generator-control-state-utils.js";

export function buildGeneratorRunContext({
  model = "",
  modelType = "",
  prompt = "",
  references = [],
  selectedCount = 1,
  midjourneyCount = 4,
  size = "",
  dimensions = {},
  sourceNodeId = "",
  detectGenerationKind = () => "2d"
} = {}) {
  const safeDimensions = normalizeGeneratorRunDimensions(dimensions);
  const midjourney = isMidjourneyGeneratorModel(model);
  return {
    videoModel: modelType === "video",
    midjourney,
    count: getGeneratorBatchCount(modelType, midjourney, selectedCount, midjourneyCount),
    images: (Array.isArray(references) ? references : []).map((item) => item?.dataUrl).filter(Boolean),
    size,
    dimensions: safeDimensions,
    aspectRatio: `${safeDimensions.width} / ${safeDimensions.height}`,
    actionType: detectGenerationKind(prompt),
    sourceNodeId
  };
}

export function applyGeneratorCreatedNodeMetadata(createdNode, {
  sourceNodeId = "",
  index = 0,
  count = 1,
  trackBatch = false
} = {}) {
  if (!createdNode) return null;
  if (sourceNodeId) createdNode.dataset.generatorSourceNodeId = sourceNodeId;
  if (trackBatch) {
    createdNode.dataset.generatorBatchCount = String(count);
    createdNode.dataset.generatorBatchIndex = String(index + 1);
  }
  return createdNode;
}

export function registerGeneratorCreatedNode(createdNode, {
  createdNodes = [],
  firstSuccessfulNode = null,
  sourceNodeId = "",
  index = 0,
  count = 1,
  trackBatch = false
} = {}) {
  if (!createdNode) {
    return {
      createdNode: null,
      createdNodes,
      firstSuccessfulNode
    };
  }
  applyGeneratorCreatedNodeMetadata(createdNode, {
    sourceNodeId,
    index,
    count,
    trackBatch
  });
  if (Array.isArray(createdNodes)) createdNodes.push(createdNode);
  return {
    createdNode,
    createdNodes,
    firstSuccessfulNode: firstSuccessfulNode || createdNode
  };
}

function normalizeGeneratorRunDimensions(dimensions = {}) {
  const width = Number(dimensions?.width || 0);
  const height = Number(dimensions?.height || 0);
  return {
    width: Number.isFinite(width) && width > 0 ? width : 1024,
    height: Number.isFinite(height) && height > 0 ? height : 1024
  };
}
