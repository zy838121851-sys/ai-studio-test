import { Router } from "express";
import { getDatabaseHealth } from "../db/sqlite.js";

export function createHealthRouter() {
  const router = Router();

  router.get("/health", (_req, res) => {
    try {
      const database = getDatabaseHealth();
      res.status(database.ok ? 200 : 503).json({
        ok: database.ok,
        service: "ai-studio",
        version: process.env.npm_package_version || "local",
        database: {
          ok: database.ok,
          integrity: database.integrity,
          foreignKeyIssues: database.foreignKeyIssues,
          counts: database.counts
        }
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        service: "ai-studio",
        version: process.env.npm_package_version || "local",
        database: {
          ok: false,
          message: error.message
        }
      });
    }
  });

  return router;
}
