import { findSessionUser, getSessionToken } from "../auth/session.js";

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
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  next();
}
