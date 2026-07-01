import { sendCaughtErrorResponse } from "../lib/http-error-response.js";
import { logError } from "../lib/logger.js";

export function requestErrorLogger(error, req, res, next) {
  logError("request failed", error, {
    method: req.method,
    path: req.path,
    status: error.status || error.statusCode || 500
  });
  if (res.headersSent) {
    next(error);
    return;
  }
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 500,
    defaultMessage: "Request failed"
  });
}
