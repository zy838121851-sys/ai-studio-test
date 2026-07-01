import { Router } from "express";
import { sendErrorResponse } from "../lib/http-error-response.js";
import { getRouteParam } from "../lib/route-request.js";
import { getRequestContext } from "../lib/request-auth.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getAssetByUploadUrl, resolveExistingUploadAssetPath } from "../services/asset.service.js";

function sendUploadNotFound(res) {
  sendErrorResponse(res, 404, "Upload not found");
}

function sendUploadReadError(res, error) {
  sendErrorResponse(res, error?.statusCode || 500, "Unable to read upload");
}

export function createProtectedUploadRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/:fileName", (req, res) => {
    const publicPath = `/uploads/${getRouteParam(req, "fileName") || ""}`;
    const asset = getAssetByUploadUrl(getRequestContext(req), publicPath);
    const absolutePath = resolveExistingUploadAssetPath(asset);
    if (!asset || !absolutePath) {
      sendUploadNotFound(res);
      return;
    }
    if (asset.mimeType) res.type(asset.mimeType);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.sendFile(absolutePath, (error) => {
      if (error && !res.headersSent) {
        sendUploadReadError(res, error);
      }
    });
  });

  router.use((_req, res) => {
    sendUploadNotFound(res);
  });

  return router;
}
