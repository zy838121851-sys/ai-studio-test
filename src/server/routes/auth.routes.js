import { Router } from "express";
import QRCode from "qrcode";
import { createSession, clearSessionCookie, destroySession, getSessionToken, setSessionCookie } from "../auth/session.js";
import { authenticateUser, createUser } from "../auth/user.service.js";
import { createOAuthStart, getOAuthStateStatus, handleOAuthCallback, markOAuthStateSessionIssued } from "../auth/oauth.service.js";
import { getAuthProviderStatus } from "../auth/provider-status.service.js";
import { sendVerificationCode, verifyCodeAndGetUser } from "../auth/verification.service.js";
import { sendCaughtErrorResponse } from "../lib/http-error-response.js";
import { getOptionalRequestUser } from "../lib/request-auth.js";
import { getRequestBody, getRequestQuery, getRouteParam, requestAccepts } from "../lib/route-request.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { recordAuditEvent } from "../services/audit.service.js";

const authLimiter = createRateLimiter({
  namespace: "auth",
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts"
});

const oauthPollLimiter = createRateLimiter({
  namespace: "oauth-poll",
  windowMs: 5 * 60 * 1000,
  max: 180,
  message: "Too many OAuth status checks"
});

function handleAuthError(res, error) {
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 500,
    defaultMessage: "Authentication failed",
    useStatusMessageOnly: true
  });
}

export function createAuthRouter() {
  const router = Router();

  router.post("/auth/register", authLimiter, (req, res) => {
    try {
      const user = createUser(getRequestBody(req));
      const token = createSession(user.id);
      setSessionCookie(res, token);
      res.status(201).json({ user });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.post("/auth/login", authLimiter, (req, res) => {
    try {
      const user = authenticateUser(getRequestBody(req));
      const token = createSession(user.id);
      setSessionCookie(res, token);
      recordAuditEvent(req, "auth.login.succeeded", {
        outcome: "succeeded",
        userId: user.id
      });
      res.json({ user });
    } catch (error) {
      recordAuditEvent(req, "auth.login.failed", {
        outcome: "failed",
        status: error.status || 500
      });
      handleAuthError(res, error);
    }
  });

  router.post("/auth/code/send", authLimiter, async (req, res) => {
    try {
      const result = await sendVerificationCode(getRequestBody(req));
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
      const user = verifyCodeAndGetUser(getRequestBody(req));
      const token = createSession(user.id);
      setSessionCookie(res, token);
      res.json({ user });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.get("/auth/oauth/:provider/start", authLimiter, (req, res) => {
    try {
      const query = getRequestQuery(req);
      const result = createOAuthStart(getRouteParam(req, "provider"), {
        redirectTo: query.redirectTo
      });
      if (query.format === "json") {
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
      const query = getRequestQuery(req);
      const result = createOAuthStart(getRouteParam(req, "provider"), {
        redirectTo: query.redirectTo
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

  router.get("/auth/oauth/:provider/qr", authLimiter, async (req, res) => {
    try {
      const query = getRequestQuery(req);
      const result = createOAuthStart(getRouteParam(req, "provider"), {
        redirectTo: query.redirectTo
      });
      const qrSvg = await QRCode.toString(result.authorizationUrl, {
        type: "svg",
        width: 280,
        margin: 1,
        color: {
          dark: "#111111",
          light: "#ffffff"
        }
      });
      res.json({
        provider: result.provider,
        state: result.state,
        expiresInSeconds: result.expiresInSeconds,
        qrSvg
      });
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.get("/auth/oauth/:provider/status/:state", oauthPollLimiter, (req, res) => {
    try {
      const provider = getRouteParam(req, "provider");
      const state = getRouteParam(req, "state");
      const result = getOAuthStateStatus(provider, state);
      if (result.status === "authenticated" && result.user?.id && !result.sessionIssued) {
        const token = createSession(result.user.id);
        setSessionCookie(res, token);
        markOAuthStateSessionIssued(provider, state);
      }
      res.json(result);
    } catch (error) {
      handleAuthError(res, error);
    }
  });

  router.get("/auth/oauth/:provider/callback", async (req, res) => {
    try {
      const result = await handleOAuthCallback(getRouteParam(req, "provider"), getRequestQuery(req));
      const token = createSession(result.user.id);
      setSessionCookie(res, token);
      res.redirect(result.redirectTo || "/");
    } catch (error) {
      if (requestAccepts(req, "html")) {
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
    res.json({ user: getOptionalRequestUser(req) });
  });

  router.get("/auth/providers", (_req, res) => {
    res.json(getAuthProviderStatus());
  });

  return router;
}
