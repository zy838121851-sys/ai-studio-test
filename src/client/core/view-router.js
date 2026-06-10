const VIEW_CLASS_MAP = {
  canvas: "view-canvas",
  home: "view-home",
  library: "view-library",
  space: "view-space",
  assetsPage: "view-assets-page"
};

export function applyViewState({
  view,
  body = document.body,
  appRoot,
  homeView,
  projectLibraryView,
  profileView,
  assetsPageView,
  navRoot = document
} = {}) {
  if (!view) return;
  body.dataset.view = view;
  homeView?.classList.toggle("active", view === "home");
  projectLibraryView?.classList.toggle("active", view === "library");
  profileView?.classList.toggle("active", view === "space");
  assetsPageView?.classList.toggle("active", view === "assetsPage");

  Object.entries(VIEW_CLASS_MAP).forEach(([name, className]) => {
    appRoot?.classList.toggle(className, view === name);
  });

  navRoot.querySelectorAll(".home-side-menu [data-nav-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.navView === view);
  });
}
