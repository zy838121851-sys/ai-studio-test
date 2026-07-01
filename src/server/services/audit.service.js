import { localAuditLogger } from "../providers/audit/local-audit-logger.js";

export function recordAuditEvent(req, event, detail = {}) {
  localAuditLogger.record(event, {
    ...localAuditLogger.requestMetadata(req),
    ...detail
  });
}
