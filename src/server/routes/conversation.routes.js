import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  archiveProjectConversation,
  getConversationForUser,
  getOrCreateProjectConversation,
  listConversationMessages,
  listProjectConversations,
  restoreProjectConversation
} from "../services/conversation.service.js";
import { runConversationTurn } from "../services/conversation-orchestrator.service.js";

function userIdFromRequest(req) {
  return req.auth.user.id;
}

function sendError(res, error) {
  res.status(error.status || 400).json({
    message: error.status ? error.message : (error.message || "Conversation request failed")
  });
}

function writeNdjson(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

export function createConversationRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/conversations", (req, res) => {
    try {
      const projectId = String(req.query?.projectId || "").trim();
      const conversations = listProjectConversations(userIdFromRequest(req), projectId);
      res.json({ conversations });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/conversations", (req, res) => {
    try {
      const projectId = String(req.body?.projectId || "").trim();
      if (req.body?.reset) archiveProjectConversation(userIdFromRequest(req), projectId);
      const conversation = getOrCreateProjectConversation(userIdFromRequest(req), projectId, req.body);
      res.json({ conversation });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/conversations/:id/messages", (req, res) => {
    const messages = listConversationMessages(userIdFromRequest(req), req.params.id);
    if (!messages) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }
    res.json({ messages });
  });

  router.post("/conversations/:id/restore", (req, res) => {
    try {
      const conversation = restoreProjectConversation(userIdFromRequest(req), req.params.id);
      res.json({ conversation });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/conversations/:id/runs", async (req, res) => {
    const conversation = getConversationForUser(userIdFromRequest(req), req.params.id);
    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" });
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    try {
      await runConversationTurn({
        userId: userIdFromRequest(req),
        conversationId: conversation.id,
        text: req.body?.text,
        model: req.body?.model,
        mode: req.body?.mode || "auto",
        attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
        canvasContext: req.body?.canvasContext || {},
        emit: (event) => {
          if (!closed) writeNdjson(res, event);
        }
      });
    } catch (error) {
      if (!closed) {
        writeNdjson(res, {
          type: "error",
          message: error.message || "Conversation run failed"
        });
      }
    } finally {
      if (!closed) res.end();
    }
  });

  return router;
}
