import {
  getAuthProviders,
  getCurrentUser,
  login,
  logout,
  register,
  sendAuthCode,
  startOAuth,
  verifyAuthCode
} from "./auth-client.js";

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
  const phoneInput = root.querySelector("#authPhone");
  const codeInput = root.querySelector("#authCode");
  const passwordInput = root.querySelector("#authPassword");
  const nameInput = root.querySelector("#authName");
  const nameField = root.querySelector(".auth-name-field");
  const emailField = root.querySelector(".auth-email-field");
  const phoneField = root.querySelector(".auth-phone-field");
  const codeField = root.querySelector(".auth-code-field");
  const passwordField = root.querySelector(".auth-password-field");
  const message = root.querySelector("#authMessage");
  const submit = root.querySelector("#authSubmit");
  const codeButton = root.querySelector("#authSendCode");
  const tabs = Array.from(root.querySelectorAll("[data-auth-mode]"));
  const methodButtons = Array.from(root.querySelectorAll("[data-auth-method]"));
  const oauthButtons = Array.from(root.querySelectorAll("[data-auth-oauth]"));
  if (!entry || !entryButton || !dialog || !form) return { refresh() {} };

  let mode = "login";
  let method = "email-code";
  let user = null;
  let providerStatus = null;
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
    const displayName = user ? user.name || user.email?.split("@")[0] || user.phone || "User" : "";
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
    if (accountEmail) accountEmail.textContent = user?.email || user?.phone || "";
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

  const methodAvailability = () => ({
    "email-code": providerStatus?.emailCode?.configured !== false,
    "phone-code": providerStatus?.smsCode?.configured !== false,
    password: true
  });

  const isMethodAvailable = (name) => methodAvailability()[name] !== false;

  const providerLabel = (name) => {
    if (name === "email-code") return "邮箱验证码";
    if (name === "phone-code") return "短信验证码";
    return "邮箱密码";
  };

  const applyProviderStatus = () => {
    const availability = methodAvailability();
    methodButtons.forEach((button) => {
      const nextMethod = button.dataset.authMethod;
      const available = availability[nextMethod] !== false;
      button.disabled = !available;
      button.title = available ? "" : `${providerLabel(nextMethod)}未配置`;
    });
    oauthButtons.forEach((button) => {
      const provider = button.dataset.authOauth;
      const available = providerStatus?.oauth?.[provider]?.configured !== false;
      button.disabled = !available;
      button.title = available ? "" : `${button.textContent.trim()}未配置`;
    });
  };

  const applyMethod = () => {
    if (!isMethodAvailable(method)) {
      method = Object.keys(methodAvailability()).find((name) => isMethodAvailable(name)) || "password";
    }
    const usesEmail = method === "email-code" || method === "password";
    const usesPhone = method === "phone-code";
    const usesCode = method === "email-code" || method === "phone-code";
    const usesPassword = method === "password";
    emailField?.classList.toggle("hidden", !usesEmail);
    phoneField?.classList.toggle("hidden", !usesPhone);
    codeField?.classList.toggle("hidden", !usesCode);
    passwordField?.classList.toggle("hidden", !usesPassword);
    codeButton?.classList.toggle("hidden", !usesCode);
    if (emailInput) emailInput.required = usesEmail;
    if (phoneInput) phoneInput.required = usesPhone;
    if (codeInput) codeInput.required = usesCode;
    if (passwordInput) passwordInput.required = usesPassword;
    methodButtons.forEach((button) => button.classList.toggle("active", button.dataset.authMethod === method));
    applyProviderStatus();
    if (codeButton) codeButton.disabled = usesCode && !isMethodAvailable(method);
    submit.textContent = usesPassword ? (mode === "register" ? "注册" : "登录") : "验证码登录";
  };

  const setMode = (nextMode) => {
    mode = nextMode === "register" ? "register" : "login";
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.authMode === mode));
    title.textContent = mode === "register" ? "创建账户" : "登录到 AI Studio";
    nameField?.classList.toggle("hidden", mode !== "register");
    passwordInput?.setAttribute("autocomplete", mode === "register" ? "new-password" : "current-password");
    applyMethod();
    setMessage();
  };

  const openDialog = () => {
    setMode(mode);
    dialog.classList.remove("hidden");
    dialog.setAttribute("aria-hidden", "false");
    window.setTimeout(() => (method === "phone-code" ? phoneInput : emailInput)?.focus(), 30);
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

  const refreshProviderStatus = async () => {
    try {
      providerStatus = await getAuthProviders();
    } catch {
      providerStatus = null;
    }
    applyMethod();
  };

  entryButton.addEventListener("click", () => {
    if (user) {
      if (accountPopover?.classList.contains("hidden")) openAccountMenu();
      else closeAccountMenu();
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

  methodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        setMessage(button.title || "该登录方式未配置", "error");
        return;
      }
      method = button.dataset.authMethod || "email-code";
      applyMethod();
      setMessage();
    });
  });

  oauthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        setMessage(button.title || "该第三方登录未配置", "error");
        return;
      }
      startOAuth(button.dataset.authOauth);
    });
  });

  codeButton?.addEventListener("click", async () => {
    if (!isMethodAvailable(method)) {
      setMessage(`${providerLabel(method)}未配置`, "error");
      return;
    }
    codeButton.disabled = true;
    setMessage("正在发送验证码...");
    try {
      const channel = method === "phone-code" ? "sms" : "email";
      const target = channel === "sms" ? phoneInput.value : emailInput.value;
      const result = await sendAuthCode({ channel, target, purpose: mode });
      setMessage(result.code ? `验证码已发送：${result.code}` : "验证码已发送");
    } catch (error) {
      setMessage(error.message || "验证码发送失败", "error");
    } finally {
      codeButton.disabled = !isMethodAvailable(method);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    setMessage(mode === "register" ? "正在注册..." : "正在登录...");
    try {
      let result;
      if (method === "password") {
        const payload = {
          email: emailInput.value,
          password: passwordInput.value,
          name: nameInput?.value || ""
        };
        result = mode === "register" ? await register(payload) : await login(payload);
      } else {
        const channel = method === "phone-code" ? "sms" : "email";
        result = await verifyAuthCode({
          channel,
          target: channel === "sms" ? phoneInput.value : emailInput.value,
          code: codeInput.value,
          name: nameInput?.value || "",
          purpose: mode
        });
      }
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
  refreshProviderStatus();
  refresh();

  return { refresh };
}
