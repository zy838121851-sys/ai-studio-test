export function getGeneratorReferences(node) {
  return Array.isArray(node?._generatorReferences) ? node._generatorReferences : [];
}

export function mergeGeneratorReferences(node, nextReferences = []) {
  return [...getGeneratorReferences(node), ...nextReferences]
    .filter((item) => item?.dataUrl)
    .slice(0, 3);
}

export async function readGeneratorReferenceFiles(files = [], {
  readFileAsDataUrl,
  readImageDataUrlMetrics
} = {}) {
  const imageFiles = Array.from(files || [])
    .filter((file) => file?.type?.startsWith("image/"))
    .slice(0, 3);
  return Promise.all(imageFiles.map(async (file) => {
    const dataUrl = await readFileAsDataUrl(file);
    const metrics = await readImageDataUrlMetrics(dataUrl);
    return {
      name: file.name || "reference image",
      dataUrl,
      width: metrics.width,
      height: metrics.height
    };
  }));
}

export function removeGeneratorReferenceAtIndex(node, index) {
  const references = getGeneratorReferences(node);
  if (!Number.isInteger(index) || index < 0 || index >= references.length) return references;
  return references.filter((_, itemIndex) => itemIndex !== index);
}

export function getGeneratorReferenceStatusText(references = []) {
  return references.length
    ? `图生图 · ${references.length} 张参考图`
    : "文生图";
}
