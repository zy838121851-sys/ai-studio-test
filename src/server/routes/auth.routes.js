import { Router } from "express";
import QRCode from "qrcode";
import { createSession, clearSessionCookie, destroySession, getSessionToken, setSessionCookie } from "../auth/session.js";
import { authenticateUser, createUser } from "../auth/user.service.js";
import { createOAuthStart, handleOAuthCallback } from "../auth/oauth.service.js";
import { getAuthProviderStatus } from "../auth/provider-status.service.js";
import { sendVerificationCode, verifyCodeAndGetUser } from "../auth/verification.service.js";
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

  router.post("/auth/code/send", authLimiter, async (req, res) => {
    try {
      const result = await sendVerificationCode(req.body);
      res.json({
        message: "Verification code sent",
        channel: result.channel,
        target: result.target,
        purpose: result.purpose,
        expiresInSeconds: result.expiresInSeconds,
        delivery: result.delivery,
        ...(result.delivery === "mock" ? { code: result.code } : {})
      });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.post("/auth/code/verify", authLimiter, (req, res) => {
    try {
      const user = verifyCodeAndGetUser(req.body);
      const token = createSession(user.id);
      setSessionCookie(res, token);
      res.json({ user });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.get("/auth/oauth/:provider/start", authLimiter, (req, res) => {
    try {
      const result = createOAuthStart(req.params.provider, {
        redirectTo: req.query.redirectTo
      });
      if (req.query.format === "json") {
        res.json(result);
        return;
      }
      res.redirect(result.authorizationUrl);
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.get("/auth/oauth/:provider/qr.svg", authLimiter, async (req, res) => {
    try {
      const result = createOAuthStart(req.params.provider, {
        redirectTo: req.query.redirectTo
      });
      const svg = await QRCode.toString(result.authorizationUrl, {
        type: "svg",
        width: 280,
        margin: 1,
        color: {
          dark: "#111111",
          light: "#ffffff"
        }
      });
      res.type("image/svg+xml").send(svg);
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.get("/auth/oauth/:provider/callback", async (req, res) => {
    try {
      const result = await handleOAuthCallback(req.params.provider, req.query);
      const token = createSession(result.user.id);
      setSessionCookie(res, token);
      res.redirect(result.redirectTo || "/");
    } catch (error) {
      if (req.accepts("html")) {
        res.status(error.status || 500).send(error.message || "OAuth login failed");
        return;
      }
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

  router.get("/auth/providers", (_req, res) => {
    res.json(getAuthProviderStatus());
  });

  return router;
}
