import { localAuditLogger } from "../providers/audit/local-audit-logger.js";

export function getDefaultAuditLogger() {
  return localAuditLogger;
}

export function recordAuditEvent(req, event, detail = {}) {
  const logger = getDefaultAuditLogger();
  logger.record(event, {
    ...logger.requestMetadata(req),
    ...detail
  });
}
