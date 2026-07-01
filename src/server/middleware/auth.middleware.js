import { findSessionUser, getSessionToken } from "../auth/session.js";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { hasRequestUser, setRequestAuth } from "../lib/request-auth.js";

export function attachAuth(req, _res, next) {
  const token = getSessionToken(req);
  const session = findSessionUser(token);
  setRequestAuth(req, {
    token,
    sessionId: session?.sessionId || "",
    user: session?.user || null
  });
  next();
}

export function requireAuth(req, res, next) {
  if (!hasRequestUser(req)) {
    sendErrorResponse(res, 401, "Authentication required");
    return;
  }
  next();
}
