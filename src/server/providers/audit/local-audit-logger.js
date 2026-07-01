import { logInfo, logWarn } from "../../lib/logger.js";

function requestMetadata(req = {}) {
  return {
    ip: req.ip || req.socket?.remoteAddress || "unknown",
    userAgent: req.get?.("user-agent") || ""
  };
}

export function createLocalAuditLogger() {
  return {
    record(event, detail = {}) {
      const level = detail.outcome === "failed" ? "warn" : "info";
      const payload = {
        ...detail,
        at: Date.now()
      };
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
