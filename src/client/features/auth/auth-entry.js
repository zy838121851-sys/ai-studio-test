import {
  createOAuthQr,
  getAuthProviders,
  getCreditBalance,
  getCreditTransactions,
  getCurrentUser,
  getOAuthStatus,
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
  const pointsRow = root.querySelector("[data-auth-credits-open]");
  const pointsValue = root.querySelector("[data-auth-points-value]");
  const creditDialog = root.querySelector("#creditDetailDialog");
  const creditTabButtons = Array.from(root.querySelectorAll("[data-credit-tab]"));
  const creditPanels = Array.from(root.querySelectorAll("[data-credit-panel]"));
  const creditAvatar = root.querySelector("[data-credit-avatar]");
  const creditName = root.querySelector("[data-credit-name]");
  const creditEmail = root.querySelector("[data-credit-email]");
  const creditShortId = root.querySelector("[data-credit-short-id]");
  const creditCopyId = root.querySelector("[data-credit-copy-id]");
  const creditAvailable = root.querySelector("[data-credit-available]");
  const creditReserved = root.querySelector("[data-credit-reserved]");
  const creditBalanceStatus = root.querySelector("[data-credit-balance-status]");
  const creditTransactions = root.querySelector("[data-credit-transactions]");
  const creditTransactionsStatus = root.querySelector("[data-credit-transactions-status]");
  const dialog = root.querySelector("#authDialog");
  const form = root.querySelector("#authForm");
  const title = root.querySelector("#authDialogTitle");
  const wechatPanel = root.querySelector("[data-auth-wechat-panel]");
  const wechatQr = root.querySelector("#authWechatQr");
  const nameInput = root.querySelector("#authName");
  const emailInput = root.querySelector("#authEmail");
  const phoneInput = root.querySelector("#authPhone");
  const codeInput = root.querySelector("#authCode");
  const passwordInput = root.querySelector("#authPassword");
  const nameField = root.querySelector(".auth-name-field");
  const emailField = root.querySelector(".auth-email-field");
  const phoneField = root.querySelector(".auth-phone-field");
  const codeField = root.querySelector(".auth-code-field");
  const passwordField = root.querySelector(".auth-password-field");
  const message = root.querySelector("#authMessage");
  const submit = root.querySelector("#authSubmit");
  const codeButton = root.querySelector("#authSendCode");
  const modeSwitch = root.querySelector("[data-auth-mode-switch]");
  const modeButtons = Array.from(root.querySelectorAll("[data-auth-mode]"));
  const methodButtons = Array.from(root.querySelectorAll("[data-auth-method]"));
  const oauthButtons = Array.from(root.querySelectorAll("[data-auth-oauth]"));
  if (!entry || !entryButton || !dialog || !form) return { refresh() {} };

  let method = "wechat";
  let authMode = "login";
  let user = null;
  let providerStatus = null;
  let closeMenuTimer = 0;
  let oauthPollTimer = 0;
  let oauthState = "";
  let oauthQrRequestId = 0;
  let creditBalanceRequestId = 0;
  let creditTransactionsRequestId = 0;
  let creditTransactionsLoaded = false;
  let lastCreditUserId = "";

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

  const formatCredits = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? String(Math.trunc(number)) : "--";
  };

  const getDisplayName = () => (
    user ? user.name || user.email?.split("@")[0] || user.phone || "User" : ""
  );

  const getUserInitial = () => getDisplayName().trim().charAt(0).toUpperCase() || "D";

  const getShortUserId = () => {
    const id = String(user?.id || "");
    if (!id) return "--";
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  const renderCreditProfile = () => {
    const displayName = getDisplayName();
    const initial = getUserInitial();
    if (creditAvatar) creditAvatar.textContent = initial;
    if (creditName) creditName.textContent = displayName;
    if (creditEmail) creditEmail.textContent = user?.email || user?.phone || "";
    if (creditShortId) creditShortId.textContent = getShortUserId();
  };

  const renderCreditBalance = (balance) => {
    const available = formatCredits(balance?.availableCredits);
    const reserved = formatCredits(balance?.reservedCredits);
    if (pointsValue) pointsValue.textContent = available;
    if (creditAvailable) creditAvailable.textContent = available;
    if (creditReserved) creditReserved.textContent = reserved;
    if (creditBalanceStatus) creditBalanceStatus.textContent = "";
  };

  const renderCreditBalanceError = () => {
    if (pointsValue) pointsValue.textContent = "获取失败";
    if (creditAvailable) creditAvailable.textContent = "--";
    if (creditReserved) creditReserved.textContent = "--";
    if (creditBalanceStatus) creditBalanceStatus.textContent = "积分获取失败";
  };

  const refreshCreditBalance = async ({ force = false } = {}) => {
    if (!user) return;
    if (!force && pointsValue?.textContent && pointsValue.textContent !== "--") return;
    const requestId = ++creditBalanceRequestId;
    try {
      const result = await getCreditBalance();
      if (requestId !== creditBalanceRequestId) return;
      renderCreditBalance(result.balance);
    } catch {
      if (requestId !== creditBalanceRequestId) return;
      renderCreditBalanceError();
    }
  };

  const transactionTitle = (transaction) => {
    const task = transaction.task || transaction.billingType || transaction.type || "积分变动";
    const model = transaction.model ? ` · ${transaction.model}` : "";
    return `${task}${model}`;
  };

  const transactionMeta = (transaction) => {
    const pieces = [
      transaction.provider,
      transaction.status,
      transaction.reason,
      transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : ""
    ].filter(Boolean);
    return pieces.join(" · ");
  };

  const signedCreditAmount = (transaction) => {
    const amount = Math.abs(Number(transaction.amountCredits || transaction.creditsCharged || 0));
    const positiveTypes = new Set(["grant", "release", "refund", "admin_adjust"]);
    const sign = positiveTypes.has(transaction.type) ? "+" : "-";
    return {
      sign,
      label: `${sign}${formatCredits(amount)}`,
      className: sign === "+" ? "is-positive" : "is-negative"
    };
  };

  const renderCreditTransactions = (transactions = []) => {
    if (!creditTransactions) return;
    creditTransactions.replaceChildren();
    const items = transactions.slice(0, 50);
    if (!items.length) {
      if (creditTransactionsStatus) creditTransactionsStatus.textContent = "暂无积分流水";
      return;
    }
    if (creditTransactionsStatus) creditTransactionsStatus.textContent = "";
    const fragment = document.createDocumentFragment();
    items.forEach((transaction) => {
      const item = document.createElement("div");
      item.className = "credit-transaction-item";
      const main = document.createElement("div");
      main.className = "credit-transaction-main";
      const titleEl = document.createElement("div");
      titleEl.className = "credit-transaction-title";
      titleEl.textContent = transactionTitle(transaction);
      const metaEl = document.createElement("div");
      metaEl.className = "credit-transaction-meta";
      metaEl.textContent = transactionMeta(transaction);
      const amount = signedCreditAmount(transaction);
      const amountEl = document.createElement("strong");
      amountEl.className = `credit-transaction-amount ${amount.className}`;
      amountEl.textContent = amount.label;
      main.append(titleEl, metaEl);
      item.append(main, amountEl);
      fragment.appendChild(item);
    });
    creditTransactions.appendChild(fragment);
  };

  const loadCreditTransactions = async ({ force = false } = {}) => {
    if (!user || !creditTransactions) return;
    if (creditTransactionsLoaded && !force) return;
    const requestId = ++creditTransactionsRequestId;
    if (creditTransactionsStatus) creditTransactionsStatus.textContent = "正在加载积分流水...";
    try {
      const result = await getCreditTransactions({ limit: 50 });
      if (requestId !== creditTransactionsRequestId) return;
      creditTransactionsLoaded = true;
      renderCreditTransactions(result.transactions || []);
    } catch {
      if (requestId !== creditTransactionsRequestId) return;
      creditTransactions.replaceChildren();
      if (creditTransactionsStatus) creditTransactionsStatus.textContent = "积分流水获取失败";
    }
  };

  const setCreditTab = (name) => {
    creditTabButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.creditTab === name);
    });
    creditPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.creditPanel === name);
    });
    if (name === "transactions") loadCreditTransactions();
  };

  const openCreditDialog = () => {
    if (!user || !creditDialog) return;
    window.clearTimeout(closeMenuTimer);
    closeAccountMenu();
    renderCreditProfile();
    setCreditTab("account");
    creditDialog.classList.remove("hidden");
    creditDialog.setAttribute("aria-hidden", "false");
    refreshCreditBalance({ force: true });
  };

  const closeCreditDialog = () => {
    if (!creditDialog) return;
    creditDialog.classList.add("hidden");
    creditDialog.setAttribute("aria-hidden", "true");
  };

  const renderEntry = () => {
    const displayName = getDisplayName();
    const initial = getUserInitial();
    const currentUserId = user?.id || "";
    if (currentUserId !== lastCreditUserId) {
      lastCreditUserId = currentUserId;
      creditTransactionsLoaded = false;
      if (creditTransactions) creditTransactions.replaceChildren();
      if (creditTransactionsStatus) creditTransactionsStatus.textContent = "";
      if (pointsValue) pointsValue.textContent = "--";
    }
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
    if (user) {
      renderCreditProfile();
      refreshCreditBalance();
    } else {
      if (pointsValue) pointsValue.textContent = "--";
      closeAccountMenu();
      closeCreditDialog();
    }
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
    const isRegister = authMode === "register";
    const usesEmail = method === "email-code";
    const usesPassword = method === "password";
    const usesPhone = method === "phone-code";
    const usesCode = method === "email-code" || method === "phone-code";
    wechatPanel?.classList.toggle("hidden", method !== "wechat");
    form.classList.toggle("hidden", !(usesCode || usesPassword));
    modeSwitch?.classList.toggle("hidden", method !== "password");
    nameField?.classList.toggle("hidden", !isRegister);
    emailField?.classList.toggle("hidden", !(usesEmail || usesPassword));
    phoneField?.classList.toggle("hidden", !usesPhone);
    codeField?.classList.toggle("hidden", !usesCode);
    passwordField?.classList.toggle("hidden", !usesPassword);
    codeButton?.classList.toggle("hidden", !usesCode);
    if (nameInput) nameInput.required = isRegister;
    if (emailInput) emailInput.required = usesEmail || usesPassword;
    if (phoneInput) phoneInput.required = usesPhone;
    if (codeInput) codeInput.required = usesCode;
    if (passwordInput) passwordInput.required = usesPassword;
    if (passwordInput) passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
    methodButtons.forEach((button) => button.classList.toggle("active", button.dataset.authMethod === method));
    modeButtons.forEach((button) => button.classList.toggle("active", button.dataset.authMode === authMode));
    if (title) title.textContent = isRegister ? "创建账号" : method === "wechat" ? "微信一键登录" : `${providerLabel(method)}登录`;
    if (submit) submit.textContent = isRegister ? "注册并登录" : "登录";
    applyProviderStatus();
    if (codeButton) codeButton.disabled = usesCode && !isMethodAvailable(method);
  };

  const setMethod = (nextMethod) => {
    if (nextMethod !== "wechat" && !isMethodAvailable(nextMethod)) {
      setMessage(`${providerLabel(nextMethod)}未配置`, "error");
      return;
    }
    method = nextMethod;
    if (method !== "password") authMode = "login";
    setMessage();
    applyMethod();
    if (method !== "wechat") stopOAuthPolling();
    window.setTimeout(() => (method === "phone-code" ? phoneInput : emailInput)?.focus(), 30);
  };

  const openDialog = () => {
    method = "wechat";
    authMode = "login";
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
    const creditsButton = event.target.closest("[data-auth-credits-open]");
    if (creditsButton) {
      event.preventDefault();
      event.stopPropagation();
      openCreditDialog();
      return;
    }
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

  creditDialog?.addEventListener("click", (event) => {
    if (event.target.closest("[data-credit-detail-close]")) closeCreditDialog();
  });

  creditTabButtons.forEach((button) => {
    button.addEventListener("click", () => setCreditTab(button.dataset.creditTab || "account"));
  });

  creditCopyId?.addEventListener("click", async () => {
    const id = String(user?.id || "");
    if (!id) return;
    try {
      await navigator.clipboard?.writeText(id);
      creditCopyId.title = "已复制完整 ID";
    } catch {
      creditCopyId.title = "复制失败";
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-auth-close]")) closeDialog();
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.classList.contains("hidden")) closeDialog();
    if (event.key === "Escape" && !creditDialog?.classList.contains("hidden")) closeCreditDialog();
    if (event.key === "Escape") closeAccountMenu();
  });

  window.addEventListener("ai-studio-credits-refresh", () => {
    refreshCreditBalance({ force: true });
  });

  methodButtons.forEach((button) => {
    button.addEventListener("click", () => setMethod(button.dataset.authMethod || "email-code"));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      authMode = button.dataset.authMode === "register" ? "register" : "login";
      method = "password";
      setMessage();
      applyMethod();
      stopOAuthPolling();
      window.setTimeout(() => (authMode === "register" ? nameInput : emailInput)?.focus(), 30);
    });
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
    setMessage(authMode === "register" ? "正在注册..." : "正在登录...");
    try {
      const result = authMode === "register"
        ? await register({
          name: nameInput.value,
          email: emailInput.value,
          password: passwordInput.value
        })
        : method === "password"
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
  const providersReady = refreshProviderStatus();
  const ready = refresh();

  return { refresh, ready, providersReady };
}
