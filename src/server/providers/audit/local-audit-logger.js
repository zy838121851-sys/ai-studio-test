import { logInfo, logWarn } from "../../lib/logger.js";
import { getRequestClientAddress } from "../../lib/route-request.js";

const AUDIT_SENSITIVE_KEY_PATTERN = /(key|token|cookie|password|authorization|image|dataurl|body)/i;
const MAX_AUDIT_STRING_LENGTH = 300;

function requestMetadata(req = {}) {
  return {
    ip: getRequestClientAddress(req),
    userAgent: req.get?.("user-agent") || ""
  };
}

export function sanitizeAuditDetail(value) {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !AUDIT_SENSITIVE_KEY_PATTERN.test(key))
      .map(([key, entry]) => [key, truncateAuditString(entry)])
  );
}

function truncateAuditString(value) {
  if (typeof value !== "string" || value.length <= MAX_AUDIT_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_AUDIT_STRING_LENGTH)}...`;
}

export function createLocalAuditLogger() {
  return {
    record(event, detail = {}) {
      const level = detail.outcome === "failed" ? "warn" : "info";
      const payload = sanitizeAuditDetail({
        ...detail,
        at: Date.now()
      });
      if (level === "warn") {
        logWarn(`audit:${event}`, payload);
        return;
      }
      logInfo(`audit:${event}`, payload);
    },
    requestMetadata
  };
}

export const localAuditLogger = createLocalAuditLogger();
