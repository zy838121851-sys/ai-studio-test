import { getModelType } from "../ai/model-catalog.js?v=20260627-library-bulk-select-1";

const QUOTE_REFRESH_EVENTS = [
  "change",
  "input",
  "focusin",
  "ai-studio-models-updated",
  "ai-studio-model-selection-changed"
];

const PRICE_NOT_CONFIGURED_LABEL = "\u672a\u914d\u7f6e";
const SEND_LABEL = "\u53d1\u9001";

export function initCreditQuoteBadges(root = document) {
  const scope = root || document;
  const targets = Array.from(scope.querySelectorAll("[data-credit-quote]"));
  if (!targets.length) return { refresh() {} };

  targets.forEach((target) => ensureQuoteTarget(target));

  const refresh = () => {
    targets.forEach((target) => refreshQuoteTarget(target, scope));
  };

  QUOTE_REFRESH_EVENTS.forEach((eventName) => {
    scope.addEventListener?.(eventName, refresh);
  });
  window.addEventListener("ai-studio-auth-changed", refresh);
  window.setTimeout(refresh, 0);

  return { refresh };
}

async function refreshQuoteTarget(target, root) {
  const model = readSourceValue(root, target.dataset.creditModelSource);
  const task = resolveQuoteTask(model, target.dataset.creditTask);
  const count = isMidjourneyModel(model) ? "1" : readCount(root, target);
  if (!model || !task) {
    setQuoteText(target, "");
    return;
  }

  const requestId = String(Date.now() + Math.random());
  target.dataset.quoteRequestId = requestId;
  try {
    const quote = await fetchQuote({ model, task, count });
    if (target.dataset.quoteRequestId !== requestId) return;
    const label = isMidjourneyModel(model) && task === "image_generation"
      ? `${quote?.label || ""} / 默认4张`.trim()
      : quote?.label || "";
    setQuoteText(target, formatCompactQuote(quote), false, label);
  } catch (error) {
    if (target.dataset.quoteRequestId !== requestId) return;
    const status = Number(error?.status || 0);
    setQuoteText(target, status === 401 ? "" : PRICE_NOT_CONFIGURED_LABEL, true);
  }
}

function resolveQuoteTask(model, task) {
  const cleanTask = String(task || "").trim();
  if (getModelType(model) === "video") return "video_generation";
  return cleanTask;
}

function isMidjourneyModel(model = "") {
  return String(model || "").trim().toLowerCase() === "midjourney";
}

async function fetchQuote({ model, task, count }) {
  const params = new URLSearchParams({
    model,
    task,
    count: String(count || 1)
  });
  const response = await fetch(`/api/credits/quote?${params.toString()}`, {
    credentials: "include"
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Quote request failed");
    error.status = response.status;
    throw error;
  }
  return payload.quote || payload;
}

function readSourceValue(root, selector) {
  const cleanSelector = String(selector || "").trim();
  if (!cleanSelector) return "";
  return String(root.querySelector(cleanSelector)?.value || "").trim();
}

function readCount(root, target) {
  const source = String(target.dataset.creditCountSource || "").trim();
  if (source) return String(root.querySelector(source)?.value || "1").trim();
  return String(target.dataset.creditCount || "1").trim();
}

function formatCompactQuote(quote) {
  const totalCredits = Number(quote?.totalCredits);
  if (Number.isFinite(totalCredits) && totalCredits > 0) {
    return String(Math.ceil(totalCredits));
  }
  return quote?.label || "";
}

function ensureQuoteTarget(target) {
  if (!target) return null;
  if (!target.matches?.("button")) return { costNode: target, isButton: false };

  target.querySelectorAll("[data-credit-submit-icon]").forEach((node) => node.remove());

  let costNode = target.querySelector("[data-credit-submit-cost]");
  if (!costNode) {
    target.textContent = "";
    costNode = document.createElement("span");
    costNode.className = "credit-submit-cost";
    costNode.dataset.creditSubmitCost = "";
    costNode.hidden = true;
    costNode.innerHTML = `
      <span class="credit-submit-bolt" aria-hidden="true">
        <svg viewBox="0 0 12 16" focusable="false">
          <path d="M6.9 0.8 1.4 8.3h3.7l-.9 6.9 6.4-8.7H6.8L6.9.8Z" />
        </svg>
      </span>
      <span class="credit-submit-number" data-credit-submit-number></span>
    `;
    target.append(costNode);
  }

  target.classList.add("credit-submit-button");
  return { costNode, isButton: true };
}

function setQuoteText(target, text, isError = false, fullLabel = "") {
  const quoteTarget = ensureQuoteTarget(target);
  const costNode = quoteTarget?.costNode;
  if (!costNode) return;

  const cleanText = text || "";
  const numberNode = costNode.querySelector?.("[data-credit-submit-number]");
  if (numberNode) {
    numberNode.textContent = cleanText;
  } else {
    costNode.textContent = cleanText;
  }
  if (quoteTarget.isButton) {
    costNode.hidden = !cleanText;
    target.classList.toggle("has-credit-quote", Boolean(cleanText));
    target.classList.toggle("is-credit-quote-error", Boolean(cleanText && isError));
  } else {
    target.textContent = cleanText;
    target.classList.toggle("is-error", Boolean(cleanText && isError));
  }

  const label = fullLabel || cleanText || "";
  if (label) {
    const actionLabel = quoteTarget.isButton ? `${SEND_LABEL} \u00b7 ${label}` : label;
    target.title = actionLabel;
    target.setAttribute("aria-label", actionLabel);
  } else {
    target.title = SEND_LABEL;
    target.setAttribute("aria-label", SEND_LABEL);
  }
}
