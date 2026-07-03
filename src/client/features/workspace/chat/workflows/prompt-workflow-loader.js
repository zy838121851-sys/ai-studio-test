let promptWorkflowModulePromise = null;
const promptSubmitBindings = new WeakMap();

function loadPromptWorkflowModule() {
  if (!promptWorkflowModulePromise) {
    promptWorkflowModulePromise = import("./prompt-workflow.js?v=20260628-boot-inline-1");
  }
  return promptWorkflowModulePromise;
}

function getPromptForm(payload = {}) {
  return payload.promptForm || globalThis.document?.querySelector("#promptForm") || null;
}

function replaySubmit(form) {
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
    return;
  }
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

export function bindPromptSubmit(payload = {}) {
  const promptForm = getPromptForm(payload);
  if (!promptForm) return;
  const existing = promptSubmitBindings.get(promptForm);
  if (existing) return;

  const binding = existing || {
    bound: false,
    bindingPromise: null,
    proxySubmit: null
  };

  async function bindRealSubmit() {
    if (binding.bound) return;
    if (!binding.bindingPromise) {
      binding.bindingPromise = loadPromptWorkflowModule().then((module) => {
        promptForm.removeEventListener("submit", binding.proxySubmit);
        module.bindPromptSubmit(payload);
        binding.bound = true;
      });
    }
    await binding.bindingPromise;
  }

  binding.proxySubmit = async (event) => {
    event.preventDefault();
    await bindRealSubmit();
    replaySubmit(promptForm);
  };
  promptSubmitBindings.set(promptForm, binding);
  promptForm.addEventListener("submit", binding.proxySubmit);
  window.setTimeout(() => {
    bindRealSubmit().catch((error) => {
      console.warn("[prompt-workflow] failed to preload submit workflow", error);
    });
  }, 2500);
}

export function bindPromptShortcuts({
  queryAll,
  promptInput,
  labelSelector = "[data-prompt]"
}) {
  queryAll(labelSelector).forEach((button) => {
    button.addEventListener("click", () => {
      promptInput.value = button.dataset.prompt;
      promptInput.focus();
    });
  });
}
