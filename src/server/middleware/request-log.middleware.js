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
  res.status(error.status || error.statusCode || 500).json({ message: error.message || "Request failed" });
}
