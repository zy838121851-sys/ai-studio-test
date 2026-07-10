import { localAuditLogger } from "../providers/audit/local-audit-logger.js";
import { logWarn } from "../lib/logger.js";

const AUDIT_LOGGER_METHODS = ["record", "requestMetadata"];
let defaultAuditLogger = localAuditLogger;

export function getDefaultAuditLogger() {
  return defaultAuditLogger;
}

export function setDefaultAuditLogger(logger) {
  for (const method of AUDIT_LOGGER_METHODS) {
    if (typeof logger?.[method] !== "function") {
      throw new TypeError(`Audit logger must implement ${method}()`);
    }
  }
  defaultAuditLogger = logger;
  return defaultAuditLogger;
}

export function resetDefaultAuditLogger() {
  defaultAuditLogger = localAuditLogger;
  return defaultAuditLogger;
}

export function recordAuditEvent(req, event, detail = {}) {
  const logger = getDefaultAuditLogger();
  try {
    const result = logger.record(event, {
      ...logger.requestMetadata(req),
      ...detail
    });
    result?.catch?.((error) => reportAuditLoggerFailure(event, error));
    return true;
  } catch (error) {
    reportAuditLoggerFailure(event, error);
    return false;
  }
}

function reportAuditLoggerFailure(event, error) {
  logWarn("Audit logger failed", {
    event: String(event || ""),
    error: error?.name || "Error",
    code: error?.code || ""
  });
}
