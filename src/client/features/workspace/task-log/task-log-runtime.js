import { escapeHtml } from "../../../lib/text.js";
import { ensureTaskLogTemplate } from "./task-log-template.js";

const AUTO_REFRESH_MS = 8000;
const TASK_LOG_SELECTORS = Object.freeze({
  profileView: "#profileView",
  page: "#taskLogPage",
  refresh: "#taskLogRefresh",
  search: "#taskLogSearch",
  dateFrom: "#taskLogDateFrom",
  dateTo: "#taskLogDateTo",
  type: "#taskLogType",
  status: "#taskLogStatus",
  rows: "#taskLogRows",
  range: "#taskLogRange",
  prev: "#taskLogPrev",
  next: "#taskLogNext",
  limit: "#taskLogLimit",
  modal: "#taskLogModal",
  modalEyebrow: "#taskLogModal .task-log-modal-header p",
  modalTitle: "#taskLogModal .task-log-modal-header h2",
  detailBody: "#taskLogDetailBody"
});
const STATUS_LABELS = {
  queued: "排队中",
  running: "运行中",
  succeeded: "成功",
  failed: "失败",
  timeout: "超时",
  save_failed: "保存失败",
  cancelled: "已取消"
};

// Contract: #taskLogPage must exist before binding, and dataset.taskLogBound
// prevents duplicate listeners when workspace runtime is mounted again.
export function bindTaskLogRuntime(runtime = {}) {
  const documentRoot = runtime.documentRoot || globalThis.document;
  ensureTaskLogTemplate(documentRoot);
  const elements = collectTaskLogElements(documentRoot);
  if (!elements.page || elements.page.dataset.taskLogBound === "true") return null;
  elements.page.dataset.taskLogBound = "true";

  const state = {
    jobs: [],
    total: 0,
    limit: Number(elements.limit?.value || 10),
    offset: 0,
    loading: false,
    loaded: false,
    autoTimer: null,
    debounceTimer: null
  };

  const refresh = () => loadJobs({ elements, state });
  const scheduleFilterRefresh = () => scheduleTaskLogFilterRefresh(state, refresh);
  // Visibility is owned by workspace routing: body[data-view="space"] and
  // #profileView.active must stay stable during any future template split.
  const syncVisibility = () => {
    const visible = isTaskLogVisible(documentRoot, elements);
    if (visible && !state.loaded) refresh();
    if (visible) startTaskLogAutoRefresh(state, refresh);
    if (!visible) stopTaskLogAutoRefresh(state);
  };

  elements.refresh?.addEventListener("click", refresh);
  elements.search?.addEventListener("input", scheduleFilterRefresh);
  elements.dateFrom?.addEventListener("change", scheduleFilterRefresh);
  elements.dateTo?.addEventListener("change", scheduleFilterRefresh);
  elements.type?.addEventListener("change", scheduleFilterRefresh);
  elements.status?.addEventListener("change", scheduleFilterRefresh);
  elements.limit?.addEventListener("change", () => {
    state.limit = Number(elements.limit.value || 10);
    state.offset = 0;
    refresh();
  });
  elements.prev?.addEventListener("click", () => {
    state.offset = Math.max(0, state.offset - state.limit);
    refresh();
  });
  elements.next?.addEventListener("click", () => {
    if (state.offset + state.limit >= state.total) return;
    state.offset += state.limit;
    refresh();
  });
  // Row actions are delegated from #taskLogRows because rows are regenerated.
  elements.rows?.addEventListener("click", (event) => {
    handleTaskLogRowClick(event, elements);
  });
  // Modal actions rely on native hidden state and [data-task-log-*] buttons.
  elements.modal?.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-task-log-close]");
    const copyButton = event.target.closest("[data-task-log-copy]");
    if (closeButton) closeTaskModal(elements);
    if (copyButton) copyText(copyButton.dataset.taskLogCopy || "");
  });
  documentRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.modal?.hidden) closeTaskModal(elements);
  });

  const observer = new MutationObserver(syncVisibility);
  if (documentRoot.body) observer.observe(documentRoot.body, { attributes: true, attributeFilter: ["data-view"] });
  syncVisibility();

  return {
    refresh,
    destroy() {
      observer.disconnect();
      clearInterval(state.autoTimer);
      clearTimeout(state.debounceTimer);
      elements.page.dataset.taskLogBound = "";
    }
  };
}

function isTaskLogVisible(documentRoot, elements) {
  return documentRoot.body?.dataset.view === "space" || elements.profileView?.classList.contains("active");
}

function startTaskLogAutoRefresh(state, refresh) {
  if (state.autoTimer) return;
  state.autoTimer = setInterval(() => {
    if (!state.loading) refresh();
  }, AUTO_REFRESH_MS);
}

function stopTaskLogAutoRefresh(state) {
  if (!state.autoTimer) return;
  clearInterval(state.autoTimer);
  state.autoTimer = null;
}

function scheduleTaskLogFilterRefresh(state, refresh) {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    state.offset = 0;
    refresh();
  }, 240);
}

function handleTaskLogRowClick(event, elements) {
  const copyButton = event.target.closest("[data-task-log-copy]");
  const detailButton = event.target.closest("[data-task-log-detail]");
  const outputButton = event.target.closest("[data-task-log-output]");
  if (copyButton) {
    copyText(copyButton.dataset.taskLogCopy || "");
  } else if (detailButton) {
    openTaskDetail(elements, detailButton.dataset.taskLogDetail || "");
  } else if (outputButton && !outputButton.disabled) {
    openTaskOutput(elements, outputButton.dataset.taskLogOutput || "");
  }
}

// Selector parity list: preserve these ids/classes before bindTaskLogRuntime().
function collectTaskLogElements(root = document) {
  return {
    profileView: root.querySelector(TASK_LOG_SELECTORS.profileView),
    page: root.querySelector(TASK_LOG_SELECTORS.page),
    refresh: root.querySelector(TASK_LOG_SELECTORS.refresh),
    search: root.querySelector(TASK_LOG_SELECTORS.search),
    dateFrom: root.querySelector(TASK_LOG_SELECTORS.dateFrom),
    dateTo: root.querySelector(TASK_LOG_SELECTORS.dateTo),
    type: root.querySelector(TASK_LOG_SELECTORS.type),
    status: root.querySelector(TASK_LOG_SELECTORS.status),
    rows: root.querySelector(TASK_LOG_SELECTORS.rows),
    range: root.querySelector(TASK_LOG_SELECTORS.range),
    prev: root.querySelector(TASK_LOG_SELECTORS.prev),
    next: root.querySelector(TASK_LOG_SELECTORS.next),
    limit: root.querySelector(TASK_LOG_SELECTORS.limit),
    modal: root.querySelector(TASK_LOG_SELECTORS.modal),
    modalEyebrow: root.querySelector(TASK_LOG_SELECTORS.modalEyebrow),
    modalTitle: root.querySelector(TASK_LOG_SELECTORS.modalTitle),
    detailBody: root.querySelector(TASK_LOG_SELECTORS.detailBody)
  };
}

async function loadJobs({ elements, state }) {
  if (!elements.rows || state.loading) return;
  state.loading = true;
  elements.refresh?.classList.add("loading");
  try {
    const query = new URLSearchParams({
      limit: String(state.limit),
      offset: String(state.offset)
    });
    appendQuery(query, "q", elements.search?.value);
    appendQuery(query, "type", elements.type?.value);
    appendQuery(query, "status", elements.status?.value);
    appendQuery(query, "dateFrom", elements.dateFrom?.value);
    appendQuery(query, "dateTo", elements.dateTo?.value);
    const data = await getJson(`/api/ai/jobs?${query.toString()}`);
    state.jobs = Array.isArray(data.jobs) ? data.jobs : [];
    state.total = Number(data.total || 0);
    state.limit = Number(data.limit || state.limit || 10);
    state.offset = Number(data.offset || 0);
    state.loaded = true;
    renderRows(elements, state);
  } catch (error) {
    elements.rows.innerHTML = `<tr><td colspan="8">${escapeHtml(error.message || "任务日志加载失败")}</td></tr>`;
  } finally {
    state.loading = false;
    elements.refresh?.classList.remove("loading");
  }
}

function renderRows(elements, state) {
  if (!state.jobs.length) {
    elements.rows.innerHTML = `<tr><td colspan="8">暂无任务日志</td></tr>`;
  } else {
    elements.rows.innerHTML = state.jobs.map(renderRow).join("");
  }
  const from = state.total ? state.offset + 1 : 0;
  const to = Math.min(state.total, state.offset + state.jobs.length);
  if (elements.range) elements.range.textContent = `显示第 ${from} - ${to} 条 共 ${state.total} 条`;
  if (elements.prev) elements.prev.disabled = state.offset <= 0;
  if (elements.next) elements.next.disabled = state.offset + state.limit >= state.total;
}

function renderRow(job = {}) {
  const taskId = job.remoteTaskId || job.id || "";
  const credits = Number(job.creditsCharged || job.creditsReserved || 0);
  const canView = canViewOutput(job);
  return `
    <tr>
      <td>${escapeHtml(formatTime(job.createdAt))}</td>
      <td><span class="task-log-type">${escapeHtml(formatType(job.type))}</span></td>
      <td>${escapeHtml(job.modelId || job.providerModel || "-")}</td>
      <td>${escapeHtml(String(credits))}</td>
      <td>
        <button class="task-log-task-id" type="button" data-task-log-detail="${escapeHtml(job.id || "")}" title="${escapeHtml(taskId)}">${escapeHtml(shortId(taskId))}</button>
        <button class="task-log-icon-button" type="button" data-task-log-copy="${escapeHtml(taskId)}" title="复制任务 ID">⧉</button>
      </td>
      <td>${escapeHtml(formatDuration(job.durationMs, job.createdAt, job.completedAt, job.status))}</td>
      <td>${renderStatus(job)}</td>
      <td>${renderOutputAction(job, canView)}</td>
    </tr>
  `;
}

function renderOutputAction(job = {}, enabled = false) {
  if (!enabled) {
    return `<button class="task-log-action" type="button" disabled aria-disabled="true" title="当前任务没有可查看的生成结果">查看</button>`;
  }
  return `<button class="task-log-action" type="button" data-task-log-output="${escapeHtml(job.id || "")}">查看</button>`;
}

function canViewOutput(job = {}) {
  const outputCount = Number(job.outputCount || 0);
  const linkedOutputs = Array.isArray(job.outputAssetIds) ? job.outputAssetIds.length : 0;
  return job.status === "succeeded" && (outputCount > 0 || linkedOutputs > 0);
}

function renderStatus(job = {}) {
  const status = String(job.status || "").trim() || "queued";
  const label = STATUS_LABELS[status] || status;
  const failure = job.failureMessage || job.errorMessage || "";
  return `<span class="task-log-status task-log-status-${escapeHtml(status)}" title="${escapeHtml(failure)}">${escapeHtml(label)}</span>`;
}

async function openTaskDetail(elements, jobId) {
  if (!jobId || !elements.modal || !elements.detailBody) return;
  setTaskModalTitle(elements, "Task Detail", "任务详情");
  elements.modal.hidden = false;
  elements.detailBody.innerHTML = `<div class="task-log-detail-loading">正在加载任务详情...</div>`;
  try {
    const data = await getJson(`/api/ai/jobs/${encodeURIComponent(jobId)}`);
    elements.detailBody.innerHTML = renderDetail(data);
  } catch (error) {
    elements.detailBody.innerHTML = `<div class="task-log-detail-error">${escapeHtml(error.message || "任务详情加载失败")}</div>`;
  }
}

async function openTaskOutput(elements, jobId) {
  if (!jobId || !elements.modal || !elements.detailBody) return;
  setTaskModalTitle(elements, "Generated Output", "生成结果");
  elements.modal.hidden = false;
  elements.detailBody.innerHTML = `<div class="task-log-detail-loading">正在加载生成结果...</div>`;
  try {
    const data = await getJson(`/api/ai/jobs/${encodeURIComponent(jobId)}`);
    elements.detailBody.innerHTML = renderOutputPreview(data);
  } catch (error) {
    elements.detailBody.innerHTML = `<div class="task-log-detail-error">${escapeHtml(error.message || "生成结果加载失败")}</div>`;
  }
}

function closeTaskModal(elements) {
  if (elements.modal) elements.modal.hidden = true;
}

function setTaskModalTitle(elements, eyebrow, title) {
  if (elements.modalEyebrow) elements.modalEyebrow.textContent = eyebrow;
  if (elements.modalTitle) elements.modalTitle.textContent = title;
}

function renderDetail(data = {}) {
  const job = data.job || {};
  const taskId = data.remoteTaskId || job.remoteTaskId || job.id || data.jobId || "";
  const failure = data.failureMessage || data.errorMessage || "";
  const outputLinks = collectOutputItems(data).map((item) => item.url);
  return `
    <section class="task-log-detail-section">
      <div class="task-log-detail-title">
        <h3>任务 ID</h3>
        <button type="button" data-task-log-copy="${escapeHtml(taskId)}">复制</button>
      </div>
      <code>${escapeHtml(taskId || "-")}</code>
    </section>
    <section class="task-log-detail-grid">
      <span><strong>状态</strong>${escapeHtml(STATUS_LABELS[data.status] || data.status || "-")}</span>
      <span><strong>模型</strong>${escapeHtml(job.modelId || job.providerModel || "-")}</span>
      <span><strong>价格</strong>${escapeHtml(String(data.billing?.creditsCharged || data.billing?.creditsReserved || job.creditsReserved || 0))}</span>
      <span><strong>耗时</strong>${escapeHtml(formatDuration(data.durationMs, data.createdAt, data.completedAt, data.status))}</span>
    </section>
    ${failure ? `<section class="task-log-detail-section"><h3>失败原因</h3><pre class="task-log-failure">${escapeHtml(failure)}</pre></section>` : ""}
    <section class="task-log-detail-section">
      <div class="task-log-detail-title">
        <h3>Request Data</h3>
        <button type="button" data-task-log-copy="${escapeHtml(stringifyPretty(data.requestData || {}))}">复制</button>
      </div>
      <pre>${escapeHtml(stringifyPretty(data.requestData || {}))}</pre>
    </section>
    <section class="task-log-detail-section">
      <div class="task-log-detail-title">
        <h3>Response Data</h3>
        <button type="button" data-task-log-copy="${escapeHtml(stringifyPretty(data.responseData || {}))}">复制</button>
      </div>
      <pre>${escapeHtml(stringifyPretty(data.responseData || {}))}</pre>
    </section>
    ${outputLinks.length ? `<section class="task-log-detail-section"><h3>输出</h3>${outputLinks.map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`).join("")}</section>` : ""}
  `;
}

function renderOutputPreview(data = {}) {
  const job = data.job || {};
  const taskId = data.remoteTaskId || job.remoteTaskId || job.id || data.jobId || "";
  const outputs = collectOutputItems(data);
  if (data.status !== "succeeded" || !outputs.length) {
    return `
      <section class="task-log-detail-section">
        <h3>暂无可查看结果</h3>
        <p class="task-log-muted">该任务当前没有成功保存的生成输出。</p>
      </section>
    `;
  }
  return `
    <section class="task-log-detail-section">
      <div class="task-log-detail-title">
        <h3>任务 ID</h3>
        <button type="button" data-task-log-copy="${escapeHtml(taskId)}">复制</button>
      </div>
      <code>${escapeHtml(taskId || "-")}</code>
    </section>
    <section class="task-log-output-preview">
      ${outputs.map(renderOutputItem).join("")}
    </section>
  `;
}

function renderOutputItem(item = {}) {
  if (item.kind === "model3d") {
    return `
      <figure class="task-log-output-item">
        <div class="task-log-output-model">3D Model</div>
        <figcaption><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">打开 3D 模型</a></figcaption>
      </figure>
    `;
  }
  if (item.kind === "video") {
    return `
      <figure class="task-log-output-item">
        <video class="task-log-output-video" src="${escapeHtml(item.url)}" controls playsinline></video>
        <figcaption><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">打开视频</a></figcaption>
      </figure>
    `;
  }
  return `
    <figure class="task-log-output-item">
      <img class="task-log-output-image" src="${escapeHtml(item.url)}" alt="生成结果" loading="lazy" />
      <figcaption><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">打开图片</a></figcaption>
    </figure>
  `;
}

function collectOutputItems(data = {}) {
  const items = [];
  for (const output of Array.isArray(data.outputs) ? data.outputs : []) {
    const url = String(output?.url || "").trim();
    if (!url) continue;
    items.push({
      url,
      kind: output?.type === "model3d" || String(output?.mimeType || "").includes("gltf")
        ? "model3d"
        : output?.type === "video" || String(output?.mimeType || "").startsWith("video/")
        ? "video"
        : "image"
    });
  }
  for (const url of Array.isArray(data.imageUrls) ? data.imageUrls : []) {
    if (url) items.push({ url: String(url), kind: "image" });
  }
  for (const url of Array.isArray(data.videoUrls) ? data.videoUrls : []) {
    if (url) items.push({ url: String(url), kind: "video" });
  }
  const seen = new Set();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function getJson(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function appendQuery(query, key, value) {
  const text = String(value || "").trim();
  if (text) query.set(key, text);
}

function formatTime(value) {
  const time = Number(value || 0);
  if (!time) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(time));
}

function formatType(type = "") {
  if (type === "model3d") return "3D";
  if (type === "video") return "Video";
  if (type === "image") return "Image";
  return type || "-";
}

function formatDuration(durationMs, createdAt, completedAt, status = "") {
  const explicit = Number(durationMs || 0);
  const derived = !explicit && createdAt && completedAt ? Number(completedAt) - Number(createdAt) : explicit;
  const running = !derived && ["queued", "running"].includes(String(status || ""));
  if (running) return "-";
  if (!Number.isFinite(derived) || derived <= 0) return "-";
  if (derived < 1000) return `${derived}ms`;
  const seconds = derived / 1000;
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

function shortId(value = "") {
  const text = String(value || "");
  if (text.length <= 18) return text || "-";
  return `${text.slice(0, 14)}...${text.slice(-4)}`;
}

function stringifyPretty(value = {}) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

async function copyText(text = "") {
  const value = String(text || "");
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}
