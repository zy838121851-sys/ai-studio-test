import { Router } from "express";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getAssetByUploadUrl, resolveExistingUploadAssetPath } from "../services/asset.service.js";

function userIdFromRequest(req) {
  return req.auth.user.id;
}

export function createProtectedUploadRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/:fileName", (req, res) => {
    const publicPath = `/uploads/${req.params.fileName || ""}`;
    const asset = getAssetByUploadUrl(userIdFromRequest(req), publicPath);
    const absolutePath = resolveExistingUploadAssetPath(asset);
    if (!asset || !absolutePath) {
      sendErrorResponse(res, 404, "Upload not found");
      return;
    }
    if (asset.mimeType) res.type(asset.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.sendFile(absolutePath, (error) => {
      if (error && !res.headersSent) {
        sendErrorResponse(res, error.statusCode || 500, "Unable to read upload");
      }
    });
  });

  router.use((_req, res) => {
    sendErrorResponse(res, 404, "Upload not found");
  });

  return router;
}
