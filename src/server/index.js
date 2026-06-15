import express from "express";
import { env } from "./config/env.js";
import { initializeDatabase } from "./db/sqlite.js";
import { attachAuth } from "./middleware/auth.middleware.js";
import { createAIRouter } from "./routes/ai.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createProjectRouter } from "./routes/project.routes.js";
import { createUploadRouter } from "./routes/upload.routes.js";

export function createServer() {
  initializeDatabase();

  const app = express();

  app.use(express.json({ limit: "25mb" }));
  app.use(attachAuth);
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  app.use("/api", createAuthRouter());
  app.use("/api", createAIRouter());
  app.use("/api", createUploadRouter());
  app.use("/api", createProjectRouter());
  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });
  app.use(express.static(process.cwd(), { etag: false, lastModified: false }));

  return app;
}

export function startServer(port = env.port) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`AI Canvas running at http://localhost:${port}`);
  });
}
