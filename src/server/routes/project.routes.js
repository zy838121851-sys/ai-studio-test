import { Router } from "express";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestUserId } from "../lib/request-auth.js";
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

export function createProjectRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/projects", (req, res) => {
    res.json({ projects: listProjects(getRequestUserId(req)) });
  });

  router.post("/projects", (req, res) => {
    try {
      const project = createProject(getRequestUserId(req), req.body);
      res.status(201).json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  router.get("/projects/:id", (req, res) => {
    const project = getProject(getRequestUserId(req), req.params.id, { touchLastOpened: true });
    if (!project) {
      sendErrorResponse(res, 404, "Project not found");
      return;
    }
    res.json({ project });
  });

  router.patch("/projects/:id", (req, res) => {
    try {
      const project = updateProject(getRequestUserId(req), req.params.id, req.body);
      if (!project) {
        sendErrorResponse(res, 404, "Project not found");
        return;
      }
      res.json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  router.delete("/projects/:id", (req, res) => {
    const userId = getRequestUserId(req);
    const project = softDeleteProject(userId, req.params.id);
    if (!project) {
      recordAuditEvent(req, "project.delete.failed", {
        outcome: "failed",
        status: 404,
        userId,
        projectId: req.params.id
      });
      sendErrorResponse(res, 404, "Project not found");
      return;
    }
    recordAuditEvent(req, "project.delete.succeeded", {
      outcome: "succeeded",
      userId,
      projectId: project.id
    });
    res.json({ project });
  });

  router.post("/projects/:id/save-canvas", (req, res) => {
    try {
      const project = saveProjectCanvas(getRequestUserId(req), req.params.id, req.body);
      if (!project) {
        sendErrorResponse(res, 404, "Project not found");
        return;
      }
      res.json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  return router;
}
