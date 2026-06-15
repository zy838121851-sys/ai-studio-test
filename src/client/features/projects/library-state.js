export function getProjectDisplayTitle(project, index = 0) {
  const title = project?.title || project?.prompt || "";
  return title.trim() || `Fresh Ideas ${index + 1}`;
}

export function getProjectDisplayPrompt(project) {
  return project?.prompt || "示例项目";
}

export function getProjectPreview(project, index = 0, makeFallbackThumb) {
  if (project?.thumbnail) return project.thumbnail;
  if (typeof makeFallbackThumb === "function") {
    return makeFallbackThumb(getProjectDisplayTitle(project, index), index);
  }
  return "";
}

export function getLibraryTransitionDirection({ currentIndex, nextIndex }) {
  if (nextIndex === currentIndex) return 0;
  return nextIndex > currentIndex ? 1 : -1;
}

export function wrapProjectIndex(index, length) {
  if (!length) return -1;
  return (index + length) % length;
}
