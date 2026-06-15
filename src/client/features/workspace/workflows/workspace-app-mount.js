import { startWorkspaceApp } from "./workspace-app-composition.js";
import { initHomeBackTop } from "../home/components/home-back-top.js";
import { initHomeInspirationFeed } from "../home/components/home-inspiration-feed.js";

const mountedWorkspaceApps = new WeakMap();

export function mountWorkspaceApp(target = globalThis.document) {
  const documentRoot = target?.ownerDocument || target;
  if (!documentRoot) {
    throw new Error("mountWorkspaceApp requires a document root or DOM element");
  }

  const existing = mountedWorkspaceApps.get(documentRoot);
  if (existing) {
    return existing;
  }

  const runtime = startWorkspaceApp(documentRoot);
  const homeBackTop = initHomeBackTop(documentRoot);
  const homeInspirationFeed = initHomeInspirationFeed(documentRoot);
  const compatibilityBridge = globalThis.window?.AIStudioCompatibilityBridge;
  const previousCompatibilityAlias = globalThis.window?.AIStudioLegacyBridge;

  const mountedApp = {
    runtime,
    unmount() {
      if (globalThis.window?.AIStudioCompatibilityBridge === compatibilityBridge) {
        delete globalThis.window.AIStudioCompatibilityBridge;
      }
      if (globalThis.window?.AIStudioLegacyBridge === previousCompatibilityAlias) {
        delete globalThis.window.AIStudioLegacyBridge;
      }
      homeBackTop.destroy();
      homeInspirationFeed.destroy();
      mountedWorkspaceApps.delete(documentRoot);
    }
  };

  mountedWorkspaceApps.set(documentRoot, mountedApp);
  return mountedApp;
}
