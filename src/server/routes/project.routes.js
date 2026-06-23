import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createProject,
  getProject,
  listProjects,
  saveProjectCanvas,
  softDeleteProject,
  updateProject
} from "../services/project.service.js";

function userIdFromRequest(req) {
  return req.auth.user.id;
}

function handleProjectError(res, error) {
  res.status(error.status || 400).json({
    message: error.status ? error.message : (error.message || "Project request failed")
  });
}

export function createProjectRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/projects", (req, res) => {
    res.json({ projects: listProjects(userIdFromRequest(req)) });
  });

  router.post("/projects", (req, res) => {
    try {
      const project = createProject(userIdFromRequest(req), req.body);
      res.status(201).json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  router.get("/projects/:id", (req, res) => {
    const project = getProject(userIdFromRequest(req), req.params.id, { touchLastOpened: true });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json({ project });
  });

  router.patch("/projects/:id", (req, res) => {
    try {
      const project = updateProject(userIdFromRequest(req), req.params.id, req.body);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  router.delete("/projects/:id", (req, res) => {
    const project = softDeleteProject(userIdFromRequest(req), req.params.id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json({ project });
  });

  router.post("/projects/:id/save-canvas", (req, res) => {
    try {
      const project = saveProjectCanvas(userIdFromRequest(req), req.params.id, req.body);
      if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json({ project });
    } catch (error) {
      handleProjectError(res, error);
    }
  });

  return router;
}
