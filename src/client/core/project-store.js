export const PROJECTS_KEY = "ai-studio-projects";
export const PROJECTS_DEMO_KEY = "ai-studio-demo-projects-v1";
export const ACTIVE_PROJECT_KEY = "ai-studio-active-project";
export const LIBRARY_VIEW_KEY = "ai-studio-library-view";

function getStorage() {
  return globalThis.localStorage;
}

export function loadProjectsFromStorage() {
  try {
    const saved = JSON.parse(getStorage().getItem(PROJECTS_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function saveProjectsToStorage(projects) {
  getStorage().setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getActiveProjectId() {
  return getStorage().getItem(ACTIVE_PROJECT_KEY) || "";
}

export function setActiveProjectId(projectId) {
  if (!projectId) return;
  getStorage().setItem(ACTIVE_PROJECT_KEY, projectId);
}

export function getLibraryViewMode() {
  return getStorage().getItem(LIBRARY_VIEW_KEY) || "stack";
}

export function setLibraryViewMode(mode) {
  getStorage().setItem(LIBRARY_VIEW_KEY, mode);
}

export function createProjectRecord({ title = "Untitled Project", prompt = "", thumbnail = "" } = {}) {
  const now = Date.now();
  return {
    id: `project-${now}-${Math.random().toString(16).slice(2, 7)}`,
    title,
    prompt,
    thumbnail,
    createdAt: now,
    updatedAt: now,
    itemCount: 0
  };
}

export function getActiveProjectRecord(projects, activeProjectId) {
  return projects.find((project) => project.id === activeProjectId) || projects[0] || null;
}

export function patchProjectRecord(project, patch = {}) {
  if (!project) return null;
  Object.assign(project, patch, { updatedAt: Date.now() });
  return project;
}

export function hasDemoProjectsSeeded() {
  return Boolean(getStorage().getItem(PROJECTS_DEMO_KEY));
}

export function markDemoProjectsSeeded() {
  getStorage().setItem(PROJECTS_DEMO_KEY, "1");
}

export function formatProjectDate(time) {
  if (!time) return "刚刚";
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
