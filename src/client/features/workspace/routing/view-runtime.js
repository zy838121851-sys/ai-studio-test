import { applyViewState } from "./view-router.js";

export function ensureWorkspaceShowView(runtime = {}) {
  if (typeof runtime.showView === "function") return;

  runtime.showView = (view) => {
    if (!view) return;
    const documentRoot = runtime.documentRoot || globalThis.document;
    const body = documentRoot?.body || globalThis.document?.body;
    applyViewState({
      view,
      body,
      appRoot: runtime.appRoot,
      homeView: runtime.homeView || documentRoot?.querySelector("#homeView"),
      projectLibraryView: runtime.projectLibraryView || documentRoot?.querySelector("#projectLibraryView"),
      profileView: runtime.profileView || documentRoot?.querySelector("#profileView"),
      assetsPageView: runtime.assetsPageView || documentRoot?.querySelector("#assetsPageView"),
      navRoot: runtime.documentRoot || globalThis.document
    });

    if (view !== "canvas") {
      runtime.setChatCollapsed?.(true);
      runtime.projectMenu?.classList.remove("open");
    }
    runtime.brandMenu?.classList.remove("open");
  };
}
