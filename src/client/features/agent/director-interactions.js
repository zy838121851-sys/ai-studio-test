export function bindDirectorInteractions({
  presetSkill,
  promptInput,
  canvasWorld,
  directorActions = [],
  refreshDirectorOptions = () => {},
  runDirectorAction = async () => {}
} = {}) {
  presetSkill?.addEventListener("click", () => {
    promptInput.value = "使用预设 Skill：根据当前画布素材生成一组可执行的视觉优化方案。";
    promptInput.focus();
  });

  canvasWorld?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-director-action]");
    if (!button) return;
    const directorNode = button.closest(".node-director");
    if (!directorNode) return;

    event.preventDefault();
    event.stopPropagation();

    const actionType = button.dataset.directorAction;
    if (actionType === "refresh") {
      refreshDirectorOptions(directorNode);
      return;
    }

    button.classList.add("running");
    button.disabled = true;
    try {
      const actions = actionType === "all"
        ? directorActions
        : directorActions.filter((action) => action.type === actionType);
      for (const action of actions) {
        await runDirectorAction(directorNode, action);
      }
    } finally {
      button.classList.remove("running");
      button.disabled = false;
    }
  });
}

