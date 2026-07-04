import { Router } from "express";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestContext } from "../lib/request-auth.js";
import { getRequestBody, getRouteParam } from "../lib/route-request.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { recordAuditEvent } from "../services/audit.service.js";
import {
  createProject,
  getProject,
  listProjects,
  saveProjectCanvas,
  softDeleteProject,
  updateProject
} from "../services/project.service.js";

function handleProjectError(res, error) {
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 400,
    defaultMessage: "Project request failed",
    useStatusMessageOnly: true
  });
}

function sendProjectNotFound(res) {
  sendErrorResponse(res, 404, "Project not found");
}

function readProjectRouteInput(req) {
  return {
    context: getRequestContext(req),
    projectId: getRouteParam(req, "id"),
    body: getRequestBody(req)
  };
}

export function createProjectRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/projects", (req, res) => {
    res.json({ projects: listProjects(getRequestContext(req)) });
  });

  router.post("/projects", (req, res) => {
    try {
      const { context, body } = readProjectRouteInput(req);
      const project = createProject(context, body);
      res.status(201).json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  router.get("/projects/:id", (req, res) => {
    const { context, projectId } = readProjectRouteInput(req);
    const project = getProject(context, projectId, { touchLastOpened: true });
    if (!project) {
      sendProjectNotFound(res);
      return;
    }
    res.json({ project });
  });

  router.patch("/projects/:id", (req, res) => {
    try {
      const { context, projectId, body } = readProjectRouteInput(req);
      const project = updateProject(context, projectId, body);
      if (!project) {
        sendProjectNotFound(res);
        return;
      }
      res.json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  router.delete("/projects/:id", (req, res) => {
    const { context, projectId } = readProjectRouteInput(req);
    const project = softDeleteProject(context, projectId);
    if (!project) {
      recordAuditEvent(req, "project.delete.failed", {
        outcome: "failed",
        status: 404,
        userId: context.userId,
        projectId
      });
      sendProjectNotFound(res);
      return;
    }
    recordAuditEvent(req, "project.delete.succeeded", {
      outcome: "succeeded",
      userId: context.userId,
      projectId: project.id
    });
    res.json({ project });
  });

  router.post("/projects/:id/save-canvas", (req, res) => {
    try {
      const { context, projectId, body } = readProjectRouteInput(req);
      const project = saveProjectCanvas(context, projectId, body);
      if (!project) {
        sendProjectNotFound(res);
        return;
      }
      res.json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  return router;
}
