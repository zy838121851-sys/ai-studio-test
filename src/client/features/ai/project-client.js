import { deleteJson, getJson, patchJson, postJson } from "./api-client.js";

export function listRemoteProjects() {
  return getJson("/api/projects");
}

export function saveRemoteProject(project) {
  return postJson("/api/projects", project);
}

export function getRemoteProject(id) {
  return getJson(`/api/projects/${encodeURIComponent(id)}`);
}

export function updateRemoteProject(id, patch = {}) {
  return patchJson(`/api/projects/${encodeURIComponent(id)}`, patch);
}

export function deleteRemoteProject(id) {
  return deleteJson(`/api/projects/${encodeURIComponent(id)}`);
}

export function saveRemoteProjectCanvas(id, payload = {}) {
  return postJson(`/api/projects/${encodeURIComponent(id)}/save-canvas`, payload);
}
