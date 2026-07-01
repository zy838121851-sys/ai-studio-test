import { Router } from "express";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestContext } from "../lib/request-auth.js";
import { getRequestBody, getRequestQuery, getRouteParam } from "../lib/route-request.js";
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

function sendError(res, error) {
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 400,
    defaultMessage: "Conversation request failed",
    useStatusMessageOnly: true
  });
}

function sendConversationNotFound(res) {
  sendErrorResponse(res, 404, "Conversation not found");
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
      const query = getRequestQuery(req);
      const projectId = String(query?.projectId || "").trim();
      const conversations = listProjectConversations(getRequestContext(req), projectId);
      res.json({ conversations });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/conversations", (req, res) => {
    try {
      const body = getRequestBody(req);
      const projectId = String(body?.projectId || "").trim();
      const context = getRequestContext(req);
      if (body?.reset) archiveProjectConversation(context, projectId);
      const conversation = getOrCreateProjectConversation(context, projectId, body);
      res.json({ conversation });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/conversations/:id/messages", (req, res) => {
    const messages = listConversationMessages(getRequestContext(req), getRouteParam(req, "id"));
    if (!messages) {
      sendConversationNotFound(res);
      return;
    }
    res.json({ messages });
  });

  router.post("/conversations/:id/restore", (req, res) => {
    try {
      const conversation = restoreProjectConversation(getRequestContext(req), getRouteParam(req, "id"));
      res.json({ conversation });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/conversations/:id/runs", async (req, res) => {
    const context = getRequestContext(req);
    const body = getRequestBody(req);
    const conversation = getConversationForUser(context, getRouteParam(req, "id"));
    if (!conversation) {
      sendConversationNotFound(res);
      return;
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const runId = String(body?.runId || "");
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
        userId: context.userId,
        conversationId: conversation.id,
        runId,
        text: body?.text,
        model: body?.model,
        mode: body?.mode || "auto",
        attachments: Array.isArray(body?.attachments) ? body.attachments : [],
        canvasContext: body?.canvasContext || {},
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
