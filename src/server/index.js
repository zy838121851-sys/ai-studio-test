import express from "express";
import { extname, join } from "node:path";
import { env } from "./config/env.js";
import { validateRuntimeEnvironment } from "./config/runtime.js";
import { initializeDatabase } from "./db/sqlite.js";
import { logError, logInfo } from "./lib/logger.js";
import { attachAuth } from "./middleware/auth.middleware.js";
import { requestErrorLogger } from "./middleware/request-log.middleware.js";
import { createAIRouter } from "./routes/ai.routes.js";
import { createAssetCollectionRouter } from "./routes/asset-collection.routes.js";
import { createAssetRouter } from "./routes/asset.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createProjectRouter } from "./routes/project.routes.js";
import { createProtectedUploadRouter } from "./routes/protected-upload.routes.js";
import { createUploadRouter } from "./routes/upload.routes.js";

export function createServer() {
  validateRuntimeEnvironment();
  initializeDatabase();

  const app = express();
  const rootDir = process.cwd();
  const staticOptions = {
    dotfiles: "deny",
    index: false,
    fallthrough: true
  };

  app.use(express.json({ limit: "25mb" }));
  app.use(attachAuth);

  const noStoreApi = (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  };

  app.use("/api", noStoreApi, createHealthRouter());
  app.use("/api", noStoreApi, createAuthRouter());
  app.use("/api", noStoreApi, createAIRouter());
  app.use("/api", noStoreApi, createUploadRouter());
  app.use("/api", noStoreApi, createAssetCollectionRouter());
  app.use("/api", noStoreApi, createAssetRouter());
  app.use("/api", noStoreApi, createProjectRouter());
  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });
  app.use("/uploads", createProtectedUploadRouter());
  app.use("/data", (_req, res) => {
    res.status(404).end();
  });
  app.get(["/", "/index.html"], (_req, res) => {
    res.sendFile(join(rootDir, "index.html"));
  });
  app.get("/app.js", (_req, res) => {
    res.type("application/javascript").sendFile(join(rootDir, "app.js"));
  });
  app.get("/styles.css", (_req, res) => {
    res.type("text/css").sendFile(join(rootDir, "styles.css"));
  });
  app.get("/src/main.js", (_req, res) => {
    res.type("application/javascript").sendFile(join(rootDir, "src", "main.js"));
  });
  app.use("/src/client", express.static(join(rootDir, "src", "client"), staticOptions));
  app.use("/styles", express.static(join(rootDir, "styles"), staticOptions));
  app.use("/public", express.static(join(rootDir, "public"), staticOptions));
  app.get("*", (req, res, next) => {
    if (
      req.method === "GET"
      && isAppNavigationPath(req.path)
      && req.accepts("html")
    ) {
      res.sendFile(join(rootDir, "index.html"));
      return;
    }
    next();
  });
  app.use(requestErrorLogger);

  return app;
}

function isAppNavigationPath(pathname = "") {
  const segments = String(pathname || "").split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith("."))) return false;
  const lastSegment = segments.at(-1) || "";
  return !lastSegment.includes(".") && !extname(lastSegment);
}

export function startServer(port = env.port) {
  const app = createServer();
  const server = app.listen(port, () => {
    logInfo(`AI Canvas running at http://localhost:${port}`, {
      nodeEnv: env.nodeEnv
    });
  });
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      logError(`Port ${port} is already in use. Set PORT to an available port and restart.`, error);
    } else {
      logError("Server failed to start", error);
    }
    process.exitCode = 1;
  });
  return server;
}
