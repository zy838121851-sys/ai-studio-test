import {
  fileToDataUrl
} from "./video-generator-file-utils.js";

export function getVideoReferences(node) {
  return Array.isArray(node?._videoGeneratorReferences) ? node._videoGeneratorReferences : [];
}

export async function readVideoReferenceFiles(files = [], readFile = fileToDataUrl) {
  return Promise.all(Array.from(files || [])
    .filter((file) => file?.type?.startsWith?.("image/"))
    .map(async (file) => ({
      name: file.name || "reference.png",
      dataUrl: await readFile(file)
    })));
}

export function mergeVideoReferences(current = [], nextItems = [], limit = 3) {
  return [...current, ...nextItems]
    .filter((item) => item?.dataUrl)
    .slice(0, limit);
}

export function removeVideoReferenceAt(references = [], index = -1) {
  return references.filter((_, itemIndex) => itemIndex !== index);
}
