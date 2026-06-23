import { deleteJson, getJson, patchJson, postJson } from "./api-client.js";

export function listRemoteAssets(params = {}) {
  const search = new URLSearchParams();
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.collection) search.set("collection", params.collection);
  if (params.collectionId) search.set("collectionId", params.collectionId);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return getJson(`/api/assets${suffix}`);
}

export function uploadRemoteAsset(file, metadata = {}) {
  const form = new FormData();
  form.append("file", file, file.name || "asset");
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      form.append(key, String(value));
    }
  });
  return fetch("/api/assets/upload", {
    method: "POST",
    body: form
  }).then(readAssetResponse);
}

export function registerGeneratedAsset(payload = {}) {
  return postJson("/api/assets/generated", payload);
}

export function getRemoteAsset(id) {
  return getJson(`/api/assets/${encodeURIComponent(id)}`);
}

export function updateRemoteAsset(id, patch = {}) {
  return patchJson(`/api/assets/${encodeURIComponent(id)}`, patch);
}

export function deleteRemoteAsset(id) {
  return deleteJson(`/api/assets/${encodeURIComponent(id)}`);
}

export function addRemoteAssetToProject(id, projectId) {
  return postJson(`/api/assets/${encodeURIComponent(id)}/add-to-project`, { projectId });
}

export function listRemoteAssetCollections() {
  return getJson("/api/asset-collections");
}

export function createRemoteAssetCollection(payload = {}) {
  return postJson("/api/asset-collections", payload);
}

export function updateRemoteAssetCollection(id, patch = {}) {
  return patchJson(`/api/asset-collections/${encodeURIComponent(id)}`, patch);
}

export function deleteRemoteAssetCollection(id) {
  return deleteJson(`/api/asset-collections/${encodeURIComponent(id)}`);
}

export function listRemoteCollectionAssets(id) {
  return getJson(`/api/asset-collections/${encodeURIComponent(id)}/assets`);
}

export function moveRemoteAssetToCollection(id, collectionId = "") {
  return postJson(`/api/assets/${encodeURIComponent(id)}/move-to-collection`, { collectionId });
}

async function readAssetResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
