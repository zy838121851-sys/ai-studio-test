import {
  commitGeneratedProjectPatch,
  ensureActiveProjectReadyForGeneration,
  PROMPT_PROJECT_SAVE_COPY
} from "../src/client/features/workspace/chat/workflows/prompt-project-persistence-utils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const withoutSave = await ensureActiveProjectReadyForGeneration({
  getActiveProject: () => ({ id: "project-before" })
});
assert(withoutSave.ok === true, "Project persistence guard should pass when no save function is provided");
assert(withoutSave.projectId === "project-before", "Project persistence guard should return the active project id without save");

const saveCalls = [];
const logs = [];
let activeProjectId = "project-before";
const saved = await ensureActiveProjectReadyForGeneration({
  saveCurrentProject: async (copy) => {
    saveCalls.push(copy);
    activeProjectId = "project-after";
    return true;
  },
  getActiveProject: () => ({ id: activeProjectId }),
  debugRecord: { id: "debug-record" },
  logAgentDebug: (...args) => logs.push(args)
});
assert(saved.ok === true, "Project persistence guard should pass after successful save");
assert(saved.projectId === "project-after", "Project persistence guard should return the post-save project id");
assert(saveCalls.length === 1, "Project persistence guard should save exactly once");
assert(saveCalls[0] === PROMPT_PROJECT_SAVE_COPY, "Project persistence guard should pass the shared save copy object");
assert(PROMPT_PROJECT_SAVE_COPY.pendingText === "正在保存当前项目...", "Project persistence guard should preserve pending copy");
assert(PROMPT_PROJECT_SAVE_COPY.successText === "项目已保存，开始生成", "Project persistence guard should preserve success copy");
assert(PROMPT_PROJECT_SAVE_COPY.failureText === "项目保存失败，无法开始生成", "Project persistence guard should preserve failure copy");
assert(logs.length === 2, "Project persistence guard should log start and ready events");
assert(logs[0][1] === "project.persistence.start", "Project persistence guard should log save start");
assert(logs[0][2].projectId === "project-before", "Project persistence guard should log the before-save project id");
assert(logs[1][1] === "project.persistence.ready", "Project persistence guard should log save ready");
assert(logs[1][2].projectId === "project-after", "Project persistence guard should log the ready project id");

const failedSave = await ensureActiveProjectReadyForGeneration({
  saveCurrentProject: async () => false,
  getActiveProject: () => ({ id: "project-failed" })
});
assert(failedSave.ok === false, "Project persistence guard should fail when save returns false");
assert(failedSave.projectId === "project-failed", "Project persistence guard should preserve failed save project ids");
assert(failedSave.message === PROMPT_PROJECT_SAVE_COPY.failureText, "Project persistence guard should use failure copy for failed saves");

const missingProject = await ensureActiveProjectReadyForGeneration({
  saveCurrentProject: async () => true,
  getActiveProject: () => null
});
assert(missingProject.ok === false, "Project persistence guard should fail if save succeeds without a project id");
assert(missingProject.projectId === "", "Project persistence guard should return an empty missing project id");
assert(missingProject.message === PROMPT_PROJECT_SAVE_COPY.failureText, "Project persistence guard should use failure copy for missing project ids");

const thrownError = await ensureActiveProjectReadyForGeneration({
  saveCurrentProject: async () => {
    throw new Error("Save exploded");
  },
  getActiveProject: () => ({ id: "project-error" })
});
assert(thrownError.ok === false, "Project persistence guard should fail when save throws");
assert(thrownError.projectId === "project-error", "Project persistence guard should preserve project ids after thrown saves");
assert(thrownError.message === "Save exploded", "Project persistence guard should preserve thrown save messages");

const thrownWithoutMessage = await ensureActiveProjectReadyForGeneration({
  saveCurrentProject: async () => {
    throw new Error("");
  },
  getActiveProject: () => ({ id: "project-empty-error" })
});
assert(thrownWithoutMessage.ok === false, "Project persistence guard should fail when save throws without a message");
assert(thrownWithoutMessage.projectId === "project-empty-error", "Project persistence guard should preserve project ids for empty thrown messages");
assert(thrownWithoutMessage.message === PROMPT_PROJECT_SAVE_COPY.failureText, "Project persistence guard should fall back to failure copy for empty thrown messages");

const commitOrder = [];
const generatedPatch = { title: "Generated title", thumbnail: "/uploads/generated.png" };
await commitGeneratedProjectPatch({
  patch: generatedPatch,
  updateActiveProject: (patch) => {
    commitOrder.push(["update", patch]);
  },
  saveCurrentProjectAfterGeneration: async () => {
    commitOrder.push(["save"]);
  },
  onProjectTitleRefresh: () => {
    commitOrder.push(["refresh"]);
  }
});
assert(commitOrder.length === 3, "Generated project patch commits should update, save, and refresh");
assert(commitOrder[0][0] === "update", "Generated project patch commits should update active project first");
assert(commitOrder[0][1] === generatedPatch, "Generated project patch commits should pass the original patch object");
assert(commitOrder[1][0] === "save", "Generated project patch commits should save after updating");
assert(commitOrder[2][0] === "refresh", "Generated project patch commits should refresh titles after save");

const optionalCommitOrder = [];
await commitGeneratedProjectPatch({
  patch: { itemCount: 1 },
  updateActiveProject: (patch) => {
    optionalCommitOrder.push(["update", patch.itemCount]);
  },
  onProjectTitleRefresh: () => {
    optionalCommitOrder.push(["refresh"]);
  }
});
assert(
  JSON.stringify(optionalCommitOrder) === JSON.stringify([["update", 1], ["refresh"]]),
  "Generated project patch commits should keep title refresh when save callback is unavailable"
);

console.log("Prompt project persistence utility checks passed.");
