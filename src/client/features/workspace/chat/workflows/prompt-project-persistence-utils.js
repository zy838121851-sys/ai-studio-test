export const PROMPT_PROJECT_SAVE_COPY = Object.freeze({
  pendingText: "正在保存当前项目...",
  successText: "项目已保存，开始生成",
  failureText: "项目保存失败，无法开始生成"
});

export async function ensureActiveProjectReadyForGeneration({
  saveCurrentProject,
  getActiveProject,
  debugRecord = null,
  logAgentDebug = () => {}
} = {}) {
  const beforeProjectId = getActiveProject?.()?.id || "";
  if (typeof saveCurrentProject !== "function") {
    return { ok: true, projectId: beforeProjectId };
  }
  try {
    logAgentDebug(debugRecord, "project.persistence.start", { projectId: beforeProjectId });
    const saved = await saveCurrentProject(PROMPT_PROJECT_SAVE_COPY);
    const projectId = getActiveProject?.()?.id || beforeProjectId;
    if (!saved || !projectId) {
      return {
        ok: false,
        projectId,
        message: PROMPT_PROJECT_SAVE_COPY.failureText
      };
    }
    logAgentDebug(debugRecord, "project.persistence.ready", { projectId });
    return { ok: true, projectId };
  } catch (error) {
    return {
      ok: false,
      projectId: getActiveProject?.()?.id || beforeProjectId,
      message: error?.message || PROMPT_PROJECT_SAVE_COPY.failureText
    };
  }
}

export async function commitGeneratedProjectPatch({
  patch = {},
  updateActiveProject,
  saveCurrentProjectAfterGeneration,
  onProjectTitleRefresh = () => {}
} = {}) {
  updateActiveProject(patch);
  await saveCurrentProjectAfterGeneration?.();
  onProjectTitleRefresh();
}
