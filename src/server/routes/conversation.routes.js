import { Router } from "express";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
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
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 400,
    defaultMessage: "Conversation request failed",
    useStatusMessageOnly: true
  });
}

function isResponseWritable(res) {
  return !res.writableEnded && !res.destroyed;
}

function writeNdjson(res, event) {
  return res.write(`${JSON.stringify(event)}\n`);
}

function writeConversationStreamEvent(res, event, { runId = "" } = {}) {
  const type = event?.type || "";
  if (!isResponseWritable(res)) {
    console.debug("[conversation-stream] skipped", {
      runId,
      type,
      writableEnded: Boolean(res.writableEnded),
      destroyed: Boolean(res.destroyed),
      reason: "response is not writable"
    });
    return false;
  }
  console.debug("[conversation-stream] write", {
    runId,
    type,
    writableEnded: Boolean(res.writableEnded),
    destroyed: Boolean(res.destroyed)
  });
  writeNdjson(res, event);
  return true;
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
      sendErrorResponse(res, 404, "Conversation not found");
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
      sendErrorResponse(res, 404, "Conversation not found");
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const runId = String(req.body?.runId || "");
    let responseClosed = false;
    res.on("close", () => {
      responseClosed = true;
      console.debug("[conversation-stream] response close", {
        runId,
        writableEnded: Boolean(res.writableEnded),
        destroyed: Boolean(res.destroyed)
      });
    });
    res.on("finish", () => {
      console.debug("[conversation-stream] response finish", {
        runId,
        writableEnded: Boolean(res.writableEnded),
        destroyed: Boolean(res.destroyed)
      });
    });

    try {
      await runConversationTurn({
        userId: userIdFromRequest(req),
        conversationId: conversation.id,
        runId,
        text: req.body?.text,
        model: req.body?.model,
        mode: req.body?.mode || "auto",
        attachments: Array.isArray(req.body?.attachments) ? req.body.attachments : [],
        canvasContext: req.body?.canvasContext || {},
        emit: (event) => {
          writeConversationStreamEvent(res, event, { runId });
        }
      });
    } catch (error) {
      if (isResponseWritable(res)) {
        writeConversationStreamEvent(res, {
          type: "error",
          message: error.message || "Conversation run failed"
        }, { runId });
      }
    } finally {
      if (!responseClosed && isResponseWritable(res)) res.end();
    }
  });

  return router;
}
