import { Router } from "express";
import { createSession, clearSessionCookie, destroySession, getSessionToken, setSessionCookie } from "../auth/session.js";
import { authenticateUser, createUser } from "../auth/user.service.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";

const authLimiter = createRateLimiter({
  namespace: "auth",
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts"
});

function handleAuthError(res, error) {
  res.status(error.status || 500).json({
    message: error.status ? error.message : "Authentication failed"
  });
}

export function createAuthRouter() {
  const router = Router();

  router.post("/auth/register", authLimiter, (req, res) => {
    try {
      const user = createUser(req.body);
      const token = createSession(user.id);
      setSessionCookie(res, token);
      res.status(201).json({ user });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.post("/auth/login", authLimiter, (req, res) => {
    try {
      const user = authenticateUser(req.body);
      const token = createSession(user.id);
      setSessionCookie(res, token);
      res.json({ user });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.post("/auth/logout", (req, res) => {
    destroySession(getSessionToken(req));
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get("/auth/me", (req, res) => {
    res.json({ user: req.auth?.user || null });
  });

  return router;
}
