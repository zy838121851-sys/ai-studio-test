import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getProject, listProjects, saveProject } from "../services/project.service.js";

export function createProjectRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/projects", (req, res) => {
    res.json({ projects: listProjects() });
  });

  router.get("/projects/:id", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json({ project });
  });

  router.post("/projects", (req, res) => {
    try {
      res.json({ project: saveProject(req.body) });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  return router;
}
