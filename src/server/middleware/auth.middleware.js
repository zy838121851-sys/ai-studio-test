import { findSessionUser, getSessionToken } from "../auth/session.js";
import { sendErrorResponse } from "../lib/http-error-response.js";

export function attachAuth(req, _res, next) {
  const token = getSessionToken(req);
  const session = findSessionUser(token);
  req.auth = {
    token,
    sessionId: session?.sessionId || "",
    user: session?.user || null
  };
  next();
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    sendErrorResponse(res, 401, "Authentication required");
    return;
  }
  next();
}
