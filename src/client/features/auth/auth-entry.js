import { getCurrentUser, login, logout, register } from "./auth-client.js";

export function initAuthEntry(root = document) {
  const entry = root.querySelector("#authEntry");
  const entryButton = root.querySelector("#authEntryButton");
  const accountPopover = root.querySelector("#authAccountPopover");
  const accountAvatar = root.querySelector("#authAccountAvatar");
  const accountName = root.querySelector("#authAccountName");
  const accountEmail = root.querySelector("#authAccountEmail");
  const dialog = root.querySelector("#authDialog");
  const form = root.querySelector("#authForm");
  const title = root.querySelector("#authDialogTitle");
  const emailInput = root.querySelector("#authEmail");
  const passwordInput = root.querySelector("#authPassword");
  const nameInput = root.querySelector("#authName");
  const nameField = root.querySelector(".auth-name-field");
  const message = root.querySelector("#authMessage");
  const submit = root.querySelector("#authSubmit");
  const tabs = Array.from(root.querySelectorAll("[data-auth-mode]"));
  if (!entry || !entryButton || !dialog || !form) return { refresh() {} };

  let mode = "login";
  let user = null;
  let closeMenuTimer = 0;

  const setMessage = (text = "", kind = "") => {
    if (!message) return;
    message.textContent = text;
    message.dataset.kind = kind;
  };

  const closeAccountMenu = () => {
    if (!accountPopover) return;
    accountPopover.classList.add("hidden");
    accountPopover.setAttribute("aria-hidden", "true");
    entryButton.setAttribute("aria-expanded", "false");
  };

  const renderEntry = () => {
    const displayName = user ? user.name || user.email?.split("@")[0] || "User" : "";
    const initial = displayName.trim().charAt(0).toUpperCase() || "D";
    entry.classList.toggle("is-authenticated", Boolean(user));
    entryButton.textContent = user ? initial : "登录 / 注册";
    entryButton.title = user ? "账户菜单" : "登录 / 注册";
    entryButton.setAttribute("aria-haspopup", user ? "menu" : "dialog");
    entryButton.setAttribute(
      "aria-expanded",
      accountPopover?.classList.contains("hidden") ? "false" : "true"
    );
    if (accountAvatar) accountAvatar.textContent = initial;
    if (accountName) accountName.textContent = displayName;
    if (accountEmail) accountEmail.textContent = user?.email || "";
    if (!user) closeAccountMenu();
  };

  const emitAuthChanged = () => {
    window.dispatchEvent(new CustomEvent("ai-studio-auth-changed", {
      detail: { user }
    }));
  };

  const openAccountMenu = () => {
    if (!user || !accountPopover) return;
    window.clearTimeout(closeMenuTimer);
    accountPopover.classList.remove("hidden");
    accountPopover.setAttribute("aria-hidden", "false");
    entryButton.setAttribute("aria-expanded", "true");
  };

  const scheduleCloseAccountMenu = () => {
    window.clearTimeout(closeMenuTimer);
    closeMenuTimer = window.setTimeout(closeAccountMenu, 160);
  };

  const setMode = (nextMode) => {
    mode = nextMode === "register" ? "register" : "login";
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
    title.textContent = mode === "register" ? "创建账户" : "登录到 AI Studio";
    submit.textContent = mode === "register" ? "注册" : "登录";
    nameField?.classList.toggle("hidden", mode !== "register");
    passwordInput?.setAttribute("autocomplete", mode === "register" ? "new-password" : "current-password");
    setMessage();
  };

  const openDialog = () => {
    setMode(mode);
    dialog.classList.remove("hidden");
    dialog.setAttribute("aria-hidden", "false");
    window.setTimeout(() => emailInput?.focus(), 30);
  };

  const closeDialog = () => {
    dialog.classList.add("hidden");
    dialog.setAttribute("aria-hidden", "true");
    setMessage();
  };

  const refresh = async () => {
    try {
      const result = await getCurrentUser();
      user = result.user || null;
    } catch {
      user = null;
    }
    renderEntry();
    emitAuthChanged();
  };

  entryButton.addEventListener("click", () => {
    if (user) {
      if (accountPopover?.classList.contains("hidden")) {
        openAccountMenu();
      } else {
        closeAccountMenu();
      }
      return;
    }
    openDialog();
  });

  entry.addEventListener("mouseenter", openAccountMenu);
  entry.addEventListener("mouseleave", scheduleCloseAccountMenu);
  entry.addEventListener("focusin", openAccountMenu);
  entry.addEventListener("focusout", scheduleCloseAccountMenu);

  accountPopover?.addEventListener("click", async (event) => {
    const logoutButton = event.target.closest("[data-auth-logout]");
    if (!logoutButton) return;
    logoutButton.disabled = true;
    try {
      await logout();
    } catch {
      // Keep the local UI consistent even if the session has already expired.
    }
    user = null;
    closeAccountMenu();
    renderEntry();
    emitAuthChanged();
    logoutButton.disabled = false;
  });

  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-auth-close]")) closeDialog();
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.classList.contains("hidden")) closeDialog();
    if (event.key === "Escape") closeAccountMenu();
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.authMode));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    setMessage(mode === "register" ? "正在注册..." : "正在登录...");
    try {
      const payload = {
        email: emailInput.value,
        password: passwordInput.value,
        name: nameInput?.value || ""
      };
      const result = mode === "register" ? await register(payload) : await login(payload);
      user = result.user || null;
      renderEntry();
      emitAuthChanged();
      closeDialog();
      form.reset();
    } catch (error) {
      setMessage(error.message || "操作失败", "error");
    } finally {
      submit.disabled = false;
    }
  });

  setMode("login");
  refresh();

  return { refresh };
}
