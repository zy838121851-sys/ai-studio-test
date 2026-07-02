export function getGeneratorReferences(node) {
  return Array.isArray(node?._generatorReferences) ? node._generatorReferences : [];
}

export function mergeGeneratorReferences(node, nextReferences = []) {
  return [...getGeneratorReferences(node), ...nextReferences]
    .filter((item) => item?.dataUrl)
    .slice(0, 3);
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
