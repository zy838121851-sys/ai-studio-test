import { existsSync } from "node:fs";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getAssetByUploadUrl, resolveUploadAssetPath } from "../services/asset.service.js";

function userIdFromRequest(req) {
  return req.auth.user.id;
}

export function createProtectedUploadRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/:fileName", (req, res) => {
    const publicPath = `/uploads/${req.params.fileName || ""}`;
    const asset = getAssetByUploadUrl(userIdFromRequest(req), publicPath);
    const absolutePath = resolveUploadAssetPath(asset);
    if (!asset || !absolutePath || !existsSync(absolutePath)) {
      res.status(404).json({ message: "Upload not found" });
      return;
    }
    if (asset.mimeType) res.type(asset.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.sendFile(absolutePath, (error) => {
      if (error && !res.headersSent) {
        res.status(error.statusCode || 500).json({ message: "Unable to read upload" });
      }
    });
  });

  router.use((_req, res) => {
    res.status(404).json({ message: "Upload not found" });
  });

  return router;
}
