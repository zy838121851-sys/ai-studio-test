export function initHomeBackTop(root = document) {
  const homeView = root.querySelector("#homeView");
  const button = root.querySelector("#homeBackTop");
  if (!homeView || !button || button.dataset.boundHomeBackTop === "true") {
    return { destroy() {} };
  }

  button.dataset.boundHomeBackTop = "true";
  const sync = () => {
    button.classList.toggle("show", homeView.scrollTop > 280);
  };
  const scrollToTop = () => {
    homeView.scrollTo({ top: 0, behavior: "smooth" });
  };

  homeView.addEventListener("scroll", sync, { passive: true });
  button.addEventListener("click", scrollToTop);
  sync();

  return {
    destroy() {
      homeView.removeEventListener("scroll", sync);
      button.removeEventListener("click", scrollToTop);
      delete button.dataset.boundHomeBackTop;
    }
  };
}
