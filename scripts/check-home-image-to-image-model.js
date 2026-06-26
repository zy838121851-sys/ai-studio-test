import { createProjectWorkflow } from "../src/client/features/projects/workflows/project-workflow.js";
import { bindPromptSubmit } from "../src/client/features/workspace/chat/workflows/prompt-workflow.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeElement {
  constructor() {
    this.value = "";
    this.dataset = {};
    this.classList = {
      add() {},
      remove() {},
      toggle() {}
    };
    this.listeners = new Map();
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatchEvent(event) {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((handler) => handler(event));
    return true;
  }
}

class FakeForm extends FakeElement {
  requestSubmit() {
    const handlers = this.listeners.get("submit") || [];
    const event = { type: "submit", preventDefault() {} };
    this.lastSubmitPromise = Promise.all(handlers.map((handler) => handler(event)));
    return this.lastSubmitPromise;
  }
}

const previousWindow = globalThis.window;
const previousDocument = globalThis.document;
const previousEvent = globalThis.Event;

globalThis.window = {
  setTimeout(callback) {
    callback();
    return 0;
  }
};
globalThis.document = {
  querySelectorAll() {
    return [];
  }
};
globalThis.Event = class {
  constructor(type) {
    this.type = type;
  }
};

try {
  const promptForm = new FakeForm();
  const promptInput = new FakeElement();
  const chatModelSelect = new FakeElement();
  chatModelSelect.value = "qwen-image-2.0-pro";
  chatModelSelect.__compactSelectSync = () => {};
  const canvasViewport = new FakeElement();
  canvasViewport.clientWidth = 1000;
  canvasViewport.clientHeight = 800;
  canvasViewport.getBoundingClientRect = () => ({ left: 0, top: 0 });
  const canvasWorld = {
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    }
  };

  let chatImageFiles = [];
  let capturedPayload = null;
  const referenceFile = {
    name: "reference.png",
    type: "image/png",
    size: 1234
  };

  bindPromptSubmit({
    promptForm,
    promptInput,
    chatImageFilesRef: () => chatImageFiles,
    setChatImageFiles: (files) => {
      chatImageFiles = files;
    },
    renderChatImagePreview: () => {},
    canvasViewport,
    viewportPointToWorld: () => ({ x: 0, y: 0 }),
    addThinking: () => ({}),
    updateThinking: () => {},
    addChat: () => ({ classList: { add() {} } }),
    updateChat: () => {},
    addChatImage: () => {},
    addGenerationPreview: () => ({ offsetWidth: 320, classList: { add() {} }, querySelector: () => null }),
    replacePreviewWithImage: () => ({ dataset: {}, classList: { add() {} } }),
    updateActiveProject: () => ({}),
    saveCurrentProject: async () => true,
    getActiveProject: () => ({ itemCount: 0 }),
    makeProjectTitle: () => "Home test",
    postJsonRequest: async (path, payload) => {
      assert(path === "/api/chat", "Homepage prompt should submit through /api/chat");
      capturedPayload = payload;
      return {
        imageUrl: "mock://home-result",
        requestedModel: payload.model,
        model: payload.model,
        provider: "volcengine",
        providerCalls: [
          {
            provider: "volcengine",
            model: payload.model,
            operation: "generateImage",
            endpoint: "mock://volcengine"
          }
        ]
      };
    },
    buildChatImagePayload: ({ model, prompt, images = [], size } = {}) => ({ model, prompt, images, size }),
    readFileAsDataUrl: async () => "data:image/png;base64,reference",
    recordCanvasEvent: () => {},
    chatModelSelect,
    setChatCollapsed: () => {},
    detectGenerationKind: () => "2d",
    getPendingHomeGenerationFocus: () => false,
    setPendingHomeGenerationFocus: () => {},
    centerViewOnNode: () => {},
    onProjectTitleRefresh: () => {}
  });

  let activeProject = null;
  const projectRuntime = {
    create(project) {
      activeProject = { id: "project-1", ...project };
      return activeProject;
    },
    updateActive(patch) {
      activeProject = { ...(activeProject || { id: "project-1" }), ...patch };
      return activeProject;
    },
    getActive() {
      return activeProject;
    }
  };

  const workflow = createProjectWorkflow({
    state: {
      selectedNodes: new Set(),
      selectedNode: null,
      projects: [],
      activeProjectId: ""
    },
    projectRuntime,
    services: {
      makeProjectTitleFromPrompt: () => "Home test",
      createProjectSavePatch: () => ({}),
      waitFor: async () => {}
    },
    elements: {
      body: { classList: { add() {}, remove() {} } },
      canvasWorld,
      promptInput,
      promptForm,
      chatModelSelect
    },
    ui: {
      applyViewState: () => {},
      removeNodeDeep: () => {},
      setChatCollapsed: () => {},
      applyTransform: () => {},
      setPendingHomeGenerationFocus: () => {}
    },
    chat: {
      setChatImageFiles: (files) => {
        chatImageFiles = files;
      },
      getChatImageFiles: () => chatImageFiles,
      renderChatImagePreview: () => {},
      waitFor: async () => {}
    }
  });

  await workflow.generateHomeProject("generate 3D character", "doubao-seedream-4-5-251128", [referenceFile]);
  await promptForm.lastSubmitPromise;

  assert(capturedPayload, "Homepage image-to-image should submit a chat payload");
  assert(capturedPayload.model === "doubao-seedream-4-5-251128", "Homepage image-to-image should preserve the selected Doubao model");
  assert(capturedPayload.images?.length === 1, "Homepage image-to-image should include one reference image");
  assert(chatModelSelect.value === "doubao-seedream-4-5-251128", "Homepage generation should sync the chat model selector");
  assert(promptForm.__pendingHomeGenerationModel === "", "Homepage pending model should be cleared after submit");
} finally {
  globalThis.window = previousWindow;
  globalThis.document = previousDocument;
  globalThis.Event = previousEvent;
}

console.log("Homepage image-to-image model checks passed.");
