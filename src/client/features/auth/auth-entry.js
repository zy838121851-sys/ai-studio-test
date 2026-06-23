import {
  createOAuthQr,
  getAuthProviders,
  getCurrentUser,
  getOAuthStatus,
  login,
  logout,
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
  const wechatPanel = root.querySelector("[data-auth-wechat-panel]");
  const wechatQr = root.querySelector("#authWechatQr");
  const emailInput = root.querySelector("#authEmail");
  const phoneInput = root.querySelector("#authPhone");
  const codeInput = root.querySelector("#authCode");
  const passwordInput = root.querySelector("#authPassword");
  const emailField = root.querySelector(".auth-email-field");
  const phoneField = root.querySelector(".auth-phone-field");
  const codeField = root.querySelector(".auth-code-field");
  const passwordField = root.querySelector(".auth-password-field");
  const message = root.querySelector("#authMessage");
  const submit = root.querySelector("#authSubmit");
  const codeButton = root.querySelector("#authSendCode");
  const methodButtons = Array.from(root.querySelectorAll("[data-auth-method]"));
  const oauthButtons = Array.from(root.querySelectorAll("[data-auth-oauth]"));
  if (!entry || !entryButton || !dialog || !form) return { refresh() {} };

  let method = "wechat";
  let user = null;
  let providerStatus = null;
  let closeMenuTimer = 0;
  let oauthPollTimer = 0;
  let oauthState = "";
  let oauthQrRequestId = 0;

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
    entryButton.textContent = user ? initial : "登录";
    entryButton.title = user ? "账户菜单" : "登录";
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
  const isOAuthAvailable = (name) => providerStatus?.oauth?.[name]?.configured !== false;

  const providerLabel = (name) => {
    if (name === "email-code") return "邮箱验证码";
    if (name === "phone-code") return "手机号验证码";
    if (name === "password") return "邮箱密码";
    if (name === "qq") return "QQ 登录";
    return "微信扫码登录";
  };

  const stopOAuthPolling = () => {
    window.clearInterval(oauthPollTimer);
    oauthPollTimer = 0;
    oauthState = "";
  };

  const completeOAuthLogin = (nextUser) => {
    user = nextUser || null;
    renderEntry();
    emitAuthChanged();
    closeDialog();
  };

  const pollOAuthStatus = async () => {
    if (!oauthState) return;
    try {
      const result = await getOAuthStatus("wechat", oauthState);
      if (result.status === "authenticated") {
        completeOAuthLogin(result.user);
        return;
      }
      if (result.status === "expired" || result.status === "failed") {
        stopOAuthPolling();
        setMessage("二维码已失效，请重新打开登录窗口", "error");
      }
    } catch (error) {
      stopOAuthPolling();
      setMessage(error.message || "扫码登录状态获取失败", "error");
    }
  };

  const startOAuthPolling = () => {
    window.clearInterval(oauthPollTimer);
    oauthPollTimer = window.setInterval(pollOAuthStatus, 2500);
  };

  const loadWechatQr = async () => {
    if (!wechatQr || method !== "wechat" || dialog.classList.contains("hidden")) return;
    if (!isOAuthAvailable("wechat")) {
      stopOAuthPolling();
      wechatQr.removeAttribute("src");
      setMessage("微信扫码登录未配置", "error");
      return;
    }
    const requestId = ++oauthQrRequestId;
    stopOAuthPolling();
    wechatQr.removeAttribute("src");
    setMessage("正在生成微信登录二维码...");
    try {
      const result = await createOAuthQr("wechat");
      if (requestId !== oauthQrRequestId || method !== "wechat") return;
      oauthState = result.state || "";
      wechatQr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.qrSvg || "")}`;
      setMessage();
      startOAuthPolling();
    } catch (error) {
      if (requestId !== oauthQrRequestId) return;
      setMessage(error.message || "微信登录二维码生成失败", "error");
    }
  };

  const applyProviderStatus = () => {
    methodButtons.forEach((button) => {
      const nextMethod = button.dataset.authMethod;
      const available = isMethodAvailable(nextMethod);
      button.disabled = !available;
      button.title = available ? button.getAttribute("aria-label") || "" : `${providerLabel(nextMethod)}未配置`;
    });
    oauthButtons.forEach((button) => {
      const provider = button.dataset.authOauth;
      const available = isOAuthAvailable(provider);
      button.disabled = !available;
      button.title = available ? button.getAttribute("aria-label") || "" : `${providerLabel(provider)}未配置`;
    });
  };

  const applyMethod = () => {
    const usesEmail = method === "email-code";
    const usesPassword = method === "password";
    const usesPhone = method === "phone-code";
    const usesCode = method === "email-code" || method === "phone-code";
    wechatPanel?.classList.toggle("hidden", method !== "wechat");
    form.classList.toggle("hidden", !(usesCode || usesPassword));
    emailField?.classList.toggle("hidden", !(usesEmail || usesPassword));
    phoneField?.classList.toggle("hidden", !usesPhone);
    codeField?.classList.toggle("hidden", !usesCode);
    passwordField?.classList.toggle("hidden", !usesPassword);
    codeButton?.classList.toggle("hidden", !usesCode);
    if (emailInput) emailInput.required = usesEmail || usesPassword;
    if (phoneInput) phoneInput.required = usesPhone;
    if (codeInput) codeInput.required = usesCode;
    if (passwordInput) passwordInput.required = usesPassword;
    methodButtons.forEach((button) => button.classList.toggle("active", button.dataset.authMethod === method));
    if (title) title.textContent = method === "wechat" ? "微信一键登录" : `${providerLabel(method)}登录`;
    if (submit) submit.textContent = "登录";
    applyProviderStatus();
    if (codeButton) codeButton.disabled = usesCode && !isMethodAvailable(method);
  };

  const setMethod = (nextMethod) => {
    if (nextMethod !== "wechat" && !isMethodAvailable(nextMethod)) {
      setMessage(`${providerLabel(nextMethod)}未配置`, "error");
      return;
    }
    method = nextMethod;
    setMessage();
    applyMethod();
    if (method !== "wechat") stopOAuthPolling();
    window.setTimeout(() => (method === "phone-code" ? phoneInput : emailInput)?.focus(), 30);
  };

  const openDialog = () => {
    method = "wechat";
    applyMethod();
    dialog.classList.remove("hidden");
    dialog.setAttribute("aria-hidden", "false");
    loadWechatQr();
  };

  const closeDialog = () => {
    stopOAuthPolling();
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
    if (method === "wechat" && !dialog.classList.contains("hidden")) loadWechatQr();
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

  methodButtons.forEach((button) => {
    button.addEventListener("click", () => setMethod(button.dataset.authMethod || "email-code"));
  });

  oauthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.dataset.authOauth;
      if (!isOAuthAvailable(provider)) {
        setMessage(`${providerLabel(provider)}未配置`, "error");
        return;
      }
      if (provider === "wechat" && method === "wechat") {
        loadWechatQr();
        return;
      }
      startOAuth(provider);
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
      const result = await sendAuthCode({ channel, target, purpose: "login" });
      setMessage(result.code ? `验证码已发送：${result.code}` : "验证码已发送");
    } catch (error) {
      setMessage(error.message || "验证码发送失败", "error");
    } finally {
      codeButton.disabled = !isMethodAvailable(method);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isMethodAvailable(method)) {
      setMessage(`${providerLabel(method)}未配置`, "error");
      return;
    }
    submit.disabled = true;
    setMessage("正在登录...");
    try {
      const result = method === "password"
        ? await login({
          email: emailInput.value,
          password: passwordInput.value
        })
        : await verifyAuthCode({
          channel: method === "phone-code" ? "sms" : "email",
          target: method === "phone-code" ? phoneInput.value : emailInput.value,
          code: codeInput.value,
          purpose: "login"
        });
      user = result.user || null;
      renderEntry();
      emitAuthChanged();
      closeDialog();
      form.reset();
      method = "wechat";
      applyMethod();
    } catch (error) {
      setMessage(error.message || "操作失败", "error");
    } finally {
      submit.disabled = false;
    }
  });

  applyMethod();
  refreshProviderStatus();
  refresh();

  return { refresh };
}
