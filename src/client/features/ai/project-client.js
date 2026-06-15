import { getJson, postJson } from "./api-client.js";

export function listRemoteProjects() {
  return getJson("/api/projects");
}

export function saveRemoteProject(project) {
  return postJson("/api/projects", project);
}

export function getRemoteProject(id) {
  return getJson(`/api/projects/${encodeURIComponent(id)}`);
}
