import {
  isRestorableSnapshotItem,
  normalizePersistentMediaUrl,
  restoreCanvasSnapshotJson
} from "../src/client/features/projects/snapshot.js";
import {
  createProjectSavePatch
} from "../src/client/features/projects/snapshot-save-patch.js";
import {
  getProjectMediaUrls,
  projectHasRestorableCanvasContent,
  snapshotHasUnresolvedMedia,
  snapshotNeedsUrlRepair
} from "../src/client/features/projects/snapshot-repair-utils.js";
import {
  sanitizeCanvasSnapshotJson
} from "../src/server/services/snapshot-safety.service.js";
import {
  bindProjectAuthSync,
  createProjectInitialSyncReady
} from "../src/client/features/projects/project-auth-sync.js";
import {
  createProjectRuntimeBootstrapConfig,
  hydrateProjectRuntimeState,
  syncProjectRuntimeChange
} from "../src/client/features/projects/project-runtime-sync.js";
import {
  createProjectWorkflowRuntimeConfig
} from "../src/client/features/projects/project-workflow-runtime-config.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  normalizePersistentMediaUrl("http://localhost:3000/uploads/a.png") === "/uploads/a.png",
  "Localhost uploads URLs should be stored as stable relative paths"
);
assert(
  normalizePersistentMediaUrl("http://127.0.0.1:3000/uploads/a.png?x=1#top") === "/uploads/a.png?x=1#top",
  "Loopback uploads URLs should preserve path, query, and hash"
);
assert(
  normalizePersistentMediaUrl("https://cdn.example.com/uploads/a.png") === "https://cdn.example.com/uploads/a.png",
  "External HTTPS uploads URLs should not be rewritten"
);
assert(
  normalizePersistentMediaUrl("blob:http://localhost:3000/generated") === "",
  "Blob URLs should not be persisted"
);

assert(
  !isRestorableSnapshotItem({
    kind: "loading-image",
    className: "node-card node-loading-image generation-frame",
    html: "<figure class=\"image-frame generation-frame\"></figure>"
  }),
  "Loading image snapshot nodes should not be restorable"
);
assert(
  isRestorableSnapshotItem({
    kind: "image",
    className: "node-card node-image",
    html: "<figure class=\"image-frame\"><img src=\"/uploads/a.png\" /></figure>"
  }),
  "Completed image snapshot nodes should remain restorable"
);

const restored = [];
const restoredCount = restoreCanvasSnapshotJson({
  snapshotJson: JSON.stringify({
    version: 1,
    nodes: [
      {
        kind: "loading-image",
        className: "node-card node-loading-image",
        html: "<figure class=\"image-frame generation-frame\"></figure>",
        media: { url: "" }
      },
      {
        kind: "image",
        title: "Generated Image.png",
        className: "node-card node-image",
        html: "<figure class=\"image-frame\"><img src=\"http://localhost:3000/uploads/a.png\" /></figure>",
        dataset: { objectUrl: "http://localhost:3000/uploads/a.png" },
        media: {
          url: "http://localhost:3000/uploads/a.png",
          name: "Generated Image.png",
          type: "image/png"
        }
      }
    ]
  }),
  addNode(config) {
    restored.push(config);
    return {
      className: "",
      dataset: {},
      style: {},
      setAttribute(name, value) {
        this[name] = value;
      }
    };
  }
});

assert(restoredCount === 1, "Restoring snapshots should skip loading nodes");
assert(restored.length === 1, "Only completed media nodes should be restored");
assert(restored[0].kind === "image", "Restored node should preserve completed image kind");
assert(restored[0].media.url === "/uploads/a.png", "Restored media URL should be normalized");

const savedPatch = createProjectSavePatch({
  project: { title: "Snapshot test" },
  canvasWorld: makeCanvasWorld([
    makeCanvasNode({
      kind: "loading-image",
      className: "node-card node-loading-image",
      html: "<figure class=\"image-frame generation-frame\"></figure>"
    }),
    makeCanvasNode({
      kind: "image",
      className: "node-card node-image",
      objectUrl: "http://localhost:3000/uploads/a.png",
      imageUrl: "http://localhost:3000/uploads/a.png",
      html: "<figure class=\"image-frame\"><img src=\"http://localhost:3000/uploads/a.png\" /></figure>"
    })
  ])
});
const savedSnapshot = JSON.parse(savedPatch.canvasSnapshotJson);
assert(savedSnapshot.nodes.length === 1, "Saving snapshots should skip loading image nodes");
assert(savedSnapshot.nodes[0].kind === "image", "Saving snapshots should keep completed image nodes");
assert(savedSnapshot.nodes[0].media.url === "/uploads/a.png", "Saved media URLs should be stable relative paths");
assert(savedSnapshot.nodes[0].dataset.objectUrl === "/uploads/a.png", "Saved dataset media URLs should be stable relative paths");
assert(savedSnapshot.nodes[0].html.includes("src=\"/uploads/a.png\""), "Saved snapshot HTML should use stable relative media paths");

const savedVideoPatch = createProjectSavePatch({
  project: { title: "Video snapshot test" },
  canvasWorld: makeCanvasWorld([
    makeCanvasNode({
      kind: "video",
      className: "node-card node-video",
      objectUrl: "http://localhost:3000/uploads/video.mp4",
      videoUrl: "http://localhost:3000/uploads/video.mp4",
      html: "<video src=\"http://localhost:3000/uploads/video.mp4\" poster=\"http://localhost:3000/uploads/poster.png\"></video>"
    })
  ])
});
const savedVideoSnapshot = JSON.parse(savedVideoPatch.canvasSnapshotJson);
assert(savedVideoSnapshot.nodes[0].media.url === "/uploads/video.mp4", "Saved video media URLs should be stable relative paths");
assert(savedVideoSnapshot.nodes[0].dataset.objectUrl === "/uploads/video.mp4", "Saved video dataset URLs should be stable relative paths");
assert(savedVideoSnapshot.nodes[0].html.includes("src=\"/uploads/video.mp4\""), "Saved video HTML src should use stable relative media paths");
assert(savedVideoSnapshot.nodes[0].html.includes("poster=\"/uploads/poster.png\""), "Saved video HTML poster should use stable relative media paths");

assert(
  projectHasRestorableCanvasContent({
    thumbnail: "blob:http://localhost:3000/thumb",
    canvasSnapshotJson: JSON.stringify({
      nodes: [
        {
          kind: "loading-image",
          className: "node-card node-loading-image",
          html: "<figure class=\"image-frame generation-frame\"></figure>"
        }
      ]
    }),
    itemCount: 0
  }) === false,
  "Project restore content detection should ignore transient thumbnails and loading nodes"
);
assert(
  projectHasRestorableCanvasContent({
    thumbnail: "http://localhost:3000/uploads/thumb.png",
    canvasSnapshotJson: JSON.stringify({ nodes: [] }),
    itemCount: 0
  }) === true,
  "Project restore content detection should accept stable thumbnails"
);
assert(
  snapshotNeedsUrlRepair(JSON.stringify({
    nodes: [
      {
        kind: "image",
        className: "node-card node-image",
        html: "<img src=\"http://localhost:3000/uploads/repair.png\" />",
        media: { url: "http://localhost:3000/uploads/repair.png" }
      }
    ]
  })) === true,
  "Snapshot repair detection should catch same-origin absolute media URLs"
);
assert(
  snapshotNeedsUrlRepair(JSON.stringify({
    nodes: [
      {
        kind: "video",
        className: "node-card node-video",
        html: "<video src=\"/uploads/ready.mp4\" poster=\"http://localhost:3000/uploads/poster.png\"></video>",
        media: { url: "/uploads/ready.mp4" }
      }
    ]
  })) === true,
  "Snapshot repair detection should catch same-origin absolute video poster URLs"
);
assert(
  snapshotNeedsUrlRepair(JSON.stringify({
    nodes: [
      {
        kind: "model",
        className: "node-card node-model",
        html: "<div class=\"model-viewer\"></div>",
        dataset: { objectUrl: "http://localhost:3000/uploads/model.glb" },
        media: { url: "http://localhost:3000/uploads/model.glb" }
      }
    ]
  })) === true,
  "Snapshot repair detection should catch same-origin absolute model URLs"
);
assert(
  snapshotNeedsUrlRepair(JSON.stringify({
    nodes: [
      {
        kind: "image",
        className: "node-card node-image",
        html: "<img src=\"https://cdn.example.com/uploads/ready.png\" />",
        media: { url: "https://cdn.example.com/uploads/ready.png" }
      }
    ]
  })) === false,
  "Snapshot repair detection should leave external HTTPS media URLs unchanged"
);
assert(
  snapshotHasUnresolvedMedia(JSON.stringify({
    nodes: [
      {
        kind: "image",
        className: "node-card node-image",
        html: "<img src=\"/uploads/ready.png\" />",
        media: { url: "/uploads/ready.png" }
      }
    ]
  })) === false,
  "Snapshot unresolved-media detection should allow stable upload URLs"
);
assert(
  getProjectMediaUrls({
    thumbnail: "http://localhost:3000/uploads/thumb.png",
    canvasSnapshotJson: JSON.stringify({
      nodes: [
        {
          kind: "image",
          html: "<img src=\"/uploads/html.png\" />",
          dataset: { objectUrl: "blob:http://localhost:3000/transient" },
          media: { url: "/uploads/media.png" }
        }
      ]
    })
  }).join("|") === "/uploads/thumb.png|/uploads/media.png|/uploads/html.png",
  "Project media preload URL detection should normalize stable media and skip transient URLs"
);

process.env.APP_BASE_URL = "https://ai-studio.example.test";
const serverSanitizedSnapshot = JSON.parse(sanitizeCanvasSnapshotJson(JSON.stringify({
  version: 1,
  savedAt: 2000,
  nodes: [
    {
      kind: "loading-image",
      className: "node-card node-loading-image",
      html: "<figure class=\"image-frame generation-frame\"></figure>",
      media: { url: "" }
    },
    {
      kind: "image",
      className: "node-card generation-frame",
      html: "<figure class=\"image-frame\"></figure>",
      media: { url: "" }
    },
    {
      kind: "image",
      className: "node-card node-image",
      html: "<figure><img src=\"https://ai-studio.example.test/uploads/server.png?cache=1\" /></figure>",
      dataset: {
        objectUrl: "https://ai-studio.example.test/uploads/server.png?cache=1",
        externalUrl: "https://cdn.example.com/uploads/server.png"
      },
      media: { url: "https://ai-studio.example.test/uploads/server.png?cache=1" }
    }
  ]
})));

assert(serverSanitizedSnapshot.nodes.length === 1, "Server snapshot sanitizer should skip loading image nodes");
assert(serverSanitizedSnapshot.nodes[0].media.url === "/uploads/server.png?cache=1", "Server snapshot sanitizer should normalize local media URLs");
assert(serverSanitizedSnapshot.nodes[0].dataset.objectUrl === "/uploads/server.png?cache=1", "Server snapshot sanitizer should normalize dataset media URLs");
assert(serverSanitizedSnapshot.nodes[0].dataset.externalUrl === "https://cdn.example.com/uploads/server.png", "Server snapshot sanitizer should keep external HTTPS URLs");
assert(serverSanitizedSnapshot.nodes[0].html.includes("src=\"/uploads/server.png?cache=1\""), "Server snapshot sanitizer should normalize HTML media URLs");

const authSyncCalls = [];
const authListeners = new Map();
const unbindProjectAuthSync = bindProjectAuthSync({
  target: {
    addEventListener(type, listener) {
      authListeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (authListeners.get(type) === listener) authListeners.delete(type);
    }
  },
  workflowRuntime: {
    syncRemoteProjects() {
      authSyncCalls.push(["sync"]);
    },
    renderProjectLibrary() {
      authSyncCalls.push(["library"]);
    },
    renderHomeHistory() {
      authSyncCalls.push(["home"]);
    },
    updateProjectTitle(project) {
      authSyncCalls.push(["title", project]);
    }
  },
  runtimeBootstrap: {
    projectRuntime: {
      replace(projects) {
        authSyncCalls.push(["replace", projects]);
      }
    }
  },
  state: {
    setProjects(projects) {
      authSyncCalls.push(["projects", projects]);
    },
    setActiveProjectIdInMemory(projectId) {
      authSyncCalls.push(["active", projectId]);
    }
  }
});
assert(authListeners.has("ai-studio-auth-changed"), "Project auth sync should bind auth changed events");
authListeners.get("ai-studio-auth-changed")({ detail: { user: { id: "user-1" } } });
assert(JSON.stringify(authSyncCalls) === JSON.stringify([["sync"]]), "Project auth sync should reload remote projects on login");
authListeners.get("ai-studio-auth-changed")({ detail: {} });
assert(
  JSON.stringify(authSyncCalls) === JSON.stringify([
    ["sync"],
    ["replace", []],
    ["projects", []],
    ["active", ""],
    ["library"],
    ["home"],
    ["title", null]
  ]),
  "Project auth sync should clear project state on logout"
);
unbindProjectAuthSync();
assert(!authListeners.has("ai-studio-auth-changed"), "Project auth sync should expose an unbind function");

const initialSyncCalls = [];
const initialSyncResult = await createProjectInitialSyncReady({
  workflowRuntime: {
    syncRemoteProjects() {
      initialSyncCalls.push("sync");
      return "ready";
    }
  }
});
assert(initialSyncResult === "ready", "Initial project sync should resolve with the sync result");
assert(initialSyncCalls.length === 1, "Initial project sync should call remote project sync once");

const initialSyncWarnings = [];
const failedInitialSyncResult = await createProjectInitialSyncReady({
  workflowRuntime: {
    syncRemoteProjects() {
      return Promise.reject(new Error("sync failed"));
    }
  },
  logger: {
    warn(...args) {
      initialSyncWarnings.push(args);
    }
  }
});
assert(failedInitialSyncResult === false, "Initial project sync should resolve false on failure");
assert(initialSyncWarnings.length === 1, "Initial project sync should warn on failure");
assert(initialSyncWarnings[0][0] === "Initial project sync failed", "Initial project sync warning should keep the existing message");

const runtimeSyncCalls = [];
const runtimeSyncProjects = [{ id: "project-1" }];
const runtimeSyncActiveProject = { id: "project-1", title: "Project 1" };
syncProjectRuntimeChange({
  state: {
    setProjects(projects) {
      runtimeSyncCalls.push(["projects", projects]);
    },
    setActiveProjectIdInMemory(projectId) {
      runtimeSyncCalls.push(["active", projectId]);
    }
  },
  ui: {
    updateProjectTitle(project) {
      runtimeSyncCalls.push(["title", project]);
    },
    renderProjectLibrary() {
      runtimeSyncCalls.push(["library"]);
    },
    renderHomeHistory() {
      runtimeSyncCalls.push(["home"]);
    }
  },
  projects: runtimeSyncProjects,
  activeProjectId: "project-1",
  activeProject: runtimeSyncActiveProject
});
assert(
  JSON.stringify(runtimeSyncCalls) === JSON.stringify([
    ["projects", runtimeSyncProjects],
    ["active", "project-1"],
    ["title", runtimeSyncActiveProject],
    ["library"],
    ["home"]
  ]),
  "Project runtime change sync should preserve state and UI update order"
);

const runtimeHydrationCalls = [];
const runtimeHydrationProjects = [{ id: "project-2" }];
hydrateProjectRuntimeState({
  state: {
    setProjects(projects) {
      runtimeHydrationCalls.push(["projects", projects]);
    },
    setActiveProjectIdInMemory(projectId) {
      runtimeHydrationCalls.push(["active", projectId]);
    }
  },
  runtimeBootstrap: {
    projects: runtimeHydrationProjects,
    activeProjectId: "project-2"
  }
});
assert(
  JSON.stringify(runtimeHydrationCalls) === JSON.stringify([
    ["projects", runtimeHydrationProjects],
    ["active", "project-2"]
  ]),
  "Project runtime hydration should preserve bootstrap state write order"
);

const bootstrapConfigCalls = [];
const bootstrapConfig = createProjectRuntimeBootstrapConfig({
  remoteProjectsEnabled: true,
  state: {
    setProjects(projects) {
      bootstrapConfigCalls.push(["projects", projects]);
    },
    setActiveProjectIdInMemory(projectId) {
      bootstrapConfigCalls.push(["active", projectId]);
    }
  },
  ui: {
    updateProjectTitle(project) {
      bootstrapConfigCalls.push(["title", project]);
    },
    renderProjectLibrary() {
      bootstrapConfigCalls.push(["library"]);
    },
    renderHomeHistory() {
      bootstrapConfigCalls.push(["home"]);
    }
  },
  loadProjectsFromStorage() {
    return [];
  },
  getActiveProjectId() {
    return "";
  },
  setActiveProjectId() {},
  createProjectRuntime() {
    return {};
  }
});
assert(bootstrapConfig.useStorage === false, "Remote project bootstrap config should disable local storage reads");
assert(bootstrapConfig.persistLocal === false, "Remote project bootstrap config should disable local persistence");
assert(typeof bootstrapConfig.onChange === "function", "Project bootstrap config should expose runtime onChange sync");
const bootstrapConfigProjects = [{ id: "project-3" }];
const bootstrapConfigActiveProject = { id: "project-3", title: "Project 3" };
bootstrapConfig.onChange({
  projects: bootstrapConfigProjects,
  activeProjectId: "project-3",
  activeProject: bootstrapConfigActiveProject
});
assert(
  JSON.stringify(bootstrapConfigCalls) === JSON.stringify([
    ["projects", bootstrapConfigProjects],
    ["active", "project-3"],
    ["title", bootstrapConfigActiveProject],
    ["library"],
    ["home"]
  ]),
  "Project bootstrap config should preserve runtime change sync behavior"
);

const workflowConfigCalls = [];
const workflowConfigState = { label: "workflow-state" };
const workflowConfigServices = { label: "workflow-services" };
const workflowConfigUi = { label: "workflow-ui" };
const workflowConfigProjectRuntime = { label: "project-runtime" };
const workflowConfigElements = { label: "elements" };
const workflowConfigChat = { label: "chat" };
const workflowConfig = createProjectWorkflowRuntimeConfig({
  state: { label: "state" },
  elements: workflowConfigElements,
  remoteProjectsEnabled: true,
  services: { label: "services" },
  projectRuntime: workflowConfigProjectRuntime,
  ui: { label: "ui" },
  chat: workflowConfigChat,
  createWorkflowState(options) {
    workflowConfigCalls.push(["state", options]);
    return workflowConfigState;
  },
  createWorkflowServices(options) {
    workflowConfigCalls.push(["services", options]);
    return workflowConfigServices;
  },
  createWorkflowUi(options) {
    workflowConfigCalls.push(["ui", options]);
    return workflowConfigUi;
  }
});
assert(workflowConfig.state === workflowConfigState, "Project workflow config should use the workflow state factory result");
assert(workflowConfig.services === workflowConfigServices, "Project workflow config should use the workflow services factory result");
assert(workflowConfig.ui === workflowConfigUi, "Project workflow config should use the workflow UI factory result");
assert(workflowConfig.projectRuntime === workflowConfigProjectRuntime, "Project workflow config should preserve project runtime");
assert(workflowConfig.elements === workflowConfigElements, "Project workflow config should preserve elements");
assert(workflowConfig.chat === workflowConfigChat, "Project workflow config should preserve chat");
assert(workflowConfigCalls.length === 3, "Project workflow config should call each workflow factory once");
assert(workflowConfigCalls[0][1].remoteProjectsEnabled === true, "Project workflow state should receive remote project mode");
assert(workflowConfigCalls[1][1].remoteProjectsEnabled === true, "Project workflow services should receive remote project mode");

console.log("Project snapshot checks passed.");

function makeCanvasWorld(nodes = []) {
  return {
    querySelectorAll(selector) {
      return selector === ".node-card" ? nodes : [];
    },
    querySelector(selector) {
      if (selector === ".node-image") return nodes.find((node) => node.classList.contains("node-image")) || null;
      return null;
    }
  };
}

function makeCanvasNode({
  kind = "image",
  className = "node-card node-image",
  objectUrl = "",
  imageUrl = "",
  videoUrl = "",
  html = ""
} = {}) {
  const image = imageUrl ? makeImageElement(imageUrl) : null;
  const video = videoUrl ? makeVideoElement(videoUrl) : null;
  return {
    dataset: {
      kind,
      title: "Generated Image.png",
      ...(objectUrl ? { objectUrl } : {})
    },
    className,
    classList: {
      contains(name) {
        return className.split(/\s+/).includes(name);
      }
    },
    style: {
      left: "0",
      top: "0"
    },
    innerHTML: html,
    getAttribute(name) {
      if (name === "style") return "left: 0px; top: 0px;";
      return "";
    },
    querySelector(selector) {
      if (selector === ".generation-frame") return className.includes("node-loading-image") ? {} : null;
      if (selector === ".image-frame img") return image;
      if (selector === "video") return video;
      if (selector === ".canvas-text-editor" || selector === "p") return null;
      if (selector === ".image-file-name" || selector === "h3") return { textContent: "Generated Image.png" };
      return null;
    },
    cloneNode() {
      const clone = {
        innerHTML: html,
        querySelector(selector) {
          if (selector === ".image-frame img") return makeSnapshotImageElement(clone, imageUrl);
          if (selector === "video") return makeSnapshotImageElement(clone, videoUrl);
          return null;
        },
        querySelectorAll() {
          return [];
        }
      };
      return clone;
    }
  };
}

function makeImageElement(url = "") {
  return {
    src: url,
    currentSrc: url,
    setAttribute(name, value) {
      if (name === "src") this.src = value;
    },
    removeAttribute(name) {
      if (name === "src") this.src = "";
    }
  };
}

function makeVideoElement(url = "") {
  return makeImageElement(url);
}

function makeSnapshotImageElement(clone, url = "") {
  return {
    src: url,
    currentSrc: url,
    setAttribute(name, value) {
      if (name !== "src") return;
      this.src = value;
      clone.innerHTML = clone.innerHTML.replace(/\bsrc=["'][^"']*["']/, `src="${value}"`);
    },
    removeAttribute(name) {
      if (name !== "src") return;
      this.src = "";
      clone.innerHTML = clone.innerHTML.replace(/\s+\bsrc=["'][^"']*["']/, "");
    }
  };
}
