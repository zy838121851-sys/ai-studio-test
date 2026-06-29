import { createProjectWorkflow } from "../src/client/features/projects/workflows/project-workflow.js";
import { initModelCatalog } from "../src/client/features/ai/model-catalog.js";
import { renderChatImagePreviewList } from "../src/client/features/workspace/chat/components/chat-image-preview.js?v=20260627-chat-agent-2";
import { bindPromptSubmit } from "../src/client/features/workspace/chat/workflows/prompt-workflow.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readHtmlAttribute(tag, name) {
  const match = String(tag || "").match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match?.[1] || "";
}

class FakeElement {
  constructor(tagName = "") {
    this.tagName = String(tagName || "").toUpperCase();
    this.value = "";
    this.dataset = {};
    this.children = [];
    this.currentSrc = "";
    this.src = "";
    this.alt = "";
    this._innerHTML = "";
    this.offsetWidth = 320;
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

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    if (selector === "img") {
      return this.children.find((child) => child.tagName === "IMG") || null;
    }
    return null;
  }

  set innerHTML(value) {
    this._innerHTML = String(value || "");
    this.children = [];
    const imageMatch = this._innerHTML.match(/<img\s+[^>]*>/i);
    if (!imageMatch) return;
    const image = new FakeElement("img");
    const tag = imageMatch[0];
    image.src = readHtmlAttribute(tag, "src");
    image.currentSrc = image.src;
    image.alt = readHtmlAttribute(tag, "alt");
    this.appendChild(image);
  }

  get innerHTML() {
    return this._innerHTML;
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
const previousCustomEvent = globalThis.CustomEvent;
const previousFetch = globalThis.fetch;
const previousCreateObjectUrl = globalThis.URL?.createObjectURL;

let domPreviewButtons = [];

globalThis.window = {
  setTimeout(callback, ms) {
    if (Number(ms || 0) === 600) {
      callback();
      return 0;
    }
    return globalThis.setTimeout(callback, ms);
  },
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
  dispatchEvent() {}
};
globalThis.document = {
  createElement(tagName) {
    return new FakeElement(tagName);
  },
  querySelector() {
    return null;
  },
  querySelectorAll(selector) {
    return selector === ".chat-image-preview button" ? domPreviewButtons : [];
  }
};
if (globalThis.URL && typeof globalThis.URL.createObjectURL !== "function") {
  globalThis.URL.createObjectURL = () => `blob:mock-${Math.random().toString(36).slice(2)}`;
}
globalThis.Event = class {
  constructor(type) {
    this.type = type;
  }
};
globalThis.CustomEvent = class extends globalThis.Event {
  constructor(type, init = {}) {
    super(type);
    this.detail = init.detail;
  }
};

const encoder = new TextEncoder();
globalThis.fetch = async (path) => {
  const url = String(path || "");
  if (url.startsWith("/api/models")) {
    return jsonResponse({
      defaultModel: "gpt-image-2",
      models: [
        {
          id: "gpt-image-2",
          label: "GPT Image 2",
          type: "image",
          surfaces: ["home", "chat", "generator", "imageEdit"],
          isDefault: true
        },
        {
          id: "doubao-seedream-4-5-251128",
          label: "Doubao-Seedream-4.5",
          type: "image",
          surfaces: ["home", "chat"]
        }
      ]
    });
  }
  if (url === "/api/conversations") {
    return jsonResponse({
      conversation: {
        id: "conversation-1",
        projectId: "project-1"
      }
    });
  }
  if (url === "/api/conversations/conversation-1/runs") {
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`${JSON.stringify({
          type: "message.done",
          shouldGenerate: true,
          intent: "generate_image",
          taskType: "image_generation",
          promptStrategy: "direct",
          optimizedPrompt: "generate 3D character",
          generationType: "image"
        })}\n`));
        controller.close();
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" }
    });
  }
  if (url === "/api/conversations/conversation-1/messages") {
    return jsonResponse({ messages: [] });
  }
  throw new Error(`Unexpected fetch path: ${url}`);
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

try {
  await initModelCatalog(globalThis.document);

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
  let activeProject = null;
  let capturedPayload = null;
  const referenceFile = new Blob(["reference"], { type: "image/png" });
  Object.defineProperty(referenceFile, "name", { value: "reference.png" });

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
    updateActiveProject: (patch) => {
      activeProject = { ...(activeProject || { id: "project-1", itemCount: 0 }), ...patch };
      return activeProject;
    },
    saveCurrentProject: async () => {
      if (!activeProject?.id) activeProject = { id: "project-1", itemCount: 0 };
      return true;
    },
    getActiveProject: () => activeProject,
    makeProjectTitle: () => "Home test",
    postJsonRequest: async (path, payload) => {
      assert(path === "/api/ai/generate", "Homepage prompt should submit through /api/ai/generate");
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

  const previewContainer = new FakeElement("div");
  renderChatImagePreviewList({
    container: previewContainer,
    files: [referenceFile],
    escapeHtml: (value) => String(value || ""),
    onRemove: () => {}
  });
  domPreviewButtons = previewContainer.children;
  chatImageFiles = [];
  activeProject = { id: "project-dom-only", itemCount: 0 };
  capturedPayload = null;

  const domOnlyPromptForm = new FakeForm();
  const domOnlyPromptInput = new FakeElement();
  domOnlyPromptInput.value = "3D化";
  const domOnlyModelSelect = new FakeElement();
  domOnlyModelSelect.value = "gpt-image-2";
  domOnlyModelSelect.__compactSelectSync = () => {};

  bindPromptSubmit({
    promptForm: domOnlyPromptForm,
    promptInput: domOnlyPromptInput,
    chatImageFilesRef: () => [],
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
    updateActiveProject: (patch) => {
      activeProject = { ...(activeProject || { id: "project-dom-only", itemCount: 0 }), ...patch };
      return activeProject;
    },
    saveCurrentProject: async () => true,
    getActiveProject: () => activeProject,
    makeProjectTitle: () => "DOM preview test",
    postJsonRequest: async (path, payload) => {
      assert(path === "/api/ai/generate", "DOM-only preview should submit through /api/ai/generate");
      capturedPayload = payload;
      return {
        imageUrl: "mock://dom-preview-result",
        requestedModel: payload.model,
        model: payload.model,
        provider: "mock"
      };
    },
    buildChatImagePayload: ({ model, prompt, images = [], size } = {}) => ({ model, prompt, images, size }),
    readFileAsDataUrl: async (file) => {
      assert(file === referenceFile, "DOM-only preview recovery should read the registered attachment file");
      return "data:image/png;base64,reference";
    },
    recordCanvasEvent: () => {},
    chatModelSelect: domOnlyModelSelect,
    setChatCollapsed: () => {},
    detectGenerationKind: () => "2d",
    getPendingHomeGenerationFocus: () => false,
    setPendingHomeGenerationFocus: () => {},
    centerViewOnNode: () => {},
    onProjectTitleRefresh: () => {}
  });

  domOnlyPromptForm.requestSubmit();
  await domOnlyPromptForm.lastSubmitPromise;

  assert(capturedPayload, "DOM-only preview should still submit a generation payload");
  assert(capturedPayload.images?.length === 1, "DOM-only preview should recover one reference image");
} finally {
  domPreviewButtons = [];
  globalThis.window = previousWindow;
  globalThis.document = previousDocument;
  globalThis.Event = previousEvent;
  globalThis.CustomEvent = previousCustomEvent;
  globalThis.fetch = previousFetch;
  if (globalThis.URL && previousCreateObjectUrl) {
    globalThis.URL.createObjectURL = previousCreateObjectUrl;
  } else if (globalThis.URL) {
    delete globalThis.URL.createObjectURL;
  }
}

console.log("Homepage image-to-image model checks passed.");
