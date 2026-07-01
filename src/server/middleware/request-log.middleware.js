import { sendCaughtErrorResponse } from "../lib/http-error-response.js";
import { logError } from "../lib/logger.js";
import { getRequestMethod, getRequestPath } from "../lib/route-request.js";

export function requestErrorLogger(error, req, res, next) {
  logError("request failed", error, {
    method: getRequestMethod(req),
    path: getRequestPath(req),
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
