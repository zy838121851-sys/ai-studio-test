import express from "express";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { env } from "./config/env.js";
import { validateRuntimeEnvironment } from "./config/runtime.js";
import { cleanupAuthArtifacts } from "./auth/cleanup.service.js";
import { initializeDatabase } from "./db/sqlite.js";
import { runCreditsMigration } from "./db/credits-migration.js";
import { logError, logInfo } from "./lib/logger.js";
import { getRequestMethod, getRequestPath, requestAccepts } from "./lib/route-request.js";
import { attachAuth } from "./middleware/auth.middleware.js";
import { requestErrorLogger } from "./middleware/request-log.middleware.js";
import { createAIRouter } from "./routes/ai.routes.js";
import { createAssetCollectionRouter } from "./routes/asset-collection.routes.js";
import { createAssetRouter } from "./routes/asset.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createConversationRouter } from "./routes/conversation.routes.js";
import { createCreditRouter } from "./routes/credit.routes.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createProjectRouter } from "./routes/project.routes.js";
import { createProtectedUploadRouter } from "./routes/protected-upload.routes.js";
import { createUploadRouter } from "./routes/upload.routes.js";

export function createServer() {
  validateRuntimeEnvironment();
  initializeDatabase();
  runCreditsMigration();
  cleanupAuthArtifacts();

  const app = express();
  const rootDir = process.cwd();
  const distDir = join(rootDir, "dist");
  const distIndexPath = join(distDir, "index.html");
  const useBuiltClient = env.nodeEnv === "production" && existsSync(distIndexPath);
  const staticOptions = {
    dotfiles: "deny",
    index: false,
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
  };
  const builtStaticOptions = {
    dotfiles: "deny",
    index: false,
    fallthrough: true,
    setHeaders: (res, filePath) => {
      if (isBuiltAssetPath(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return;
      }
      noStoreStatic(res);
    }
  };

  app.use(express.json({ limit: "25mb" }));
  app.use(securityHeaders);
  app.use(attachAuth);

  const noStoreApi = (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  };

  app.use("/", noStoreApi, createHealthRouter());
  app.use("/api", noStoreApi, createHealthRouter());
  app.use("/api", noStoreApi, createAuthRouter());
  app.use("/api", noStoreApi, createCreditRouter());
  app.use("/api", noStoreApi, createConversationRouter());
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
  if (useBuiltClient) {
    app.use(express.static(distDir, builtStaticOptions));
  }
  // 兼容线上生产环境的样式路径
  app.use("/styles", express.static(join(rootDir, "styles"), staticOptions));
  app.use("/assets/styles", express.static(join(rootDir, "styles"), staticOptions));
  app.get(["/", "/index.html"], (_req, res) => {
    noStoreStatic(res);
    res.sendFile(getClientIndexPath({ rootDir, distIndexPath, useBuiltClient }));
  });
  if (!useBuiltClient) {
    app.get("/app.js", (_req, res) => {
      noStoreStatic(res);
      res.type("application/javascript").sendFile(join(rootDir, "app.js"));
    });
    app.get("/styles.css", (_req, res) => {
      noStoreStatic(res);
      res.type("text/css").sendFile(join(rootDir, "styles.css"));
    });
    app.get("/src/main.js", (_req, res) => {
      noStoreStatic(res);
      res.type("application/javascript").sendFile(join(rootDir, "src", "main.js"));
    });
    app.use("/src/client", express.static(join(rootDir, "src", "client"), staticOptions));
    app.use("/styles", express.static(join(rootDir, "styles"), staticOptions));

    app.use("/public", express.static(join(rootDir, "public"), staticOptions));
    app.use("/vendor/three", express.static(join(rootDir, "node_modules", "three"), staticOptions));
  }
  app.get("*", (req, res, next) => {
    if (
      getRequestMethod(req) === "GET"
      && isAppNavigationPath(getRequestPath(req))
      && requestAccepts(req, "html")
    ) {
      noStoreStatic(res);
      res.sendFile(getClientIndexPath({ rootDir, distIndexPath, useBuiltClient }));
      return;
    }
    next();
  });
  app.use(requestErrorLogger);

  return app;
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' data: blob: https: http:",
    "connect-src 'self' https: http:"
  ].join("; "));
  next();
}

function noStoreStatic(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function getClientIndexPath({ rootDir, distIndexPath, useBuiltClient }) {
  return useBuiltClient ? distIndexPath : join(rootDir, "index.html");
}

function isBuiltAssetPath(filePath = "") {
  return String(filePath || "").split(/[\\/]/).includes("assets");
}

function isAppNavigationPath(pathname = "") {
  const segments = String(pathname || "").split("/").filter(Boolean);
  if (segments.some((segment) => segment.startsWith("."))) return false;
  const lastSegment = segments.at(-1) || "";
  return !lastSegment.includes(".") && !extname(lastSegment);
}

export function startServer(port = env.port, host = process.env.HOST || "0.0.0.0") {
  const app = createServer();
  const server = app.listen(port, host, () => {
    logInfo(`AI Canvas running at http://${host}:${port}`, {
      host,
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
