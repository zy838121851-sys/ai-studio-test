export function getProjectDisplayTitle(project, index = 0, getStoredTitle) {
  return getStoredTitle(project, index);
}

export function getProjectDisplayPrompt(project, getStoredPrompt) {
  if (project?.isDemo) return "示例项目";
  return getStoredPrompt(project);
}

export function getProjectPreview(project, index = 0, {
  getTitle,
  makeDemoThumb,
  escapeHtml,
  getStoredPreview
} = {}) {
  if (project?.isDemo) return makeDemoThumb?.(getTitle(project, index), index, escapeHtml);
  return getStoredPreview?.(project, index);
}
