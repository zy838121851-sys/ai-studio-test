import { Router } from "express";
import { getRequestBody } from "../lib/route-request.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { normalizeUploadMetadata } from "../services/upload.service.js";

const metadataLimiter = createRateLimiter({
  namespace: "upload-metadata",
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many upload metadata requests"
});

export function createUploadRouter() {
  const router = Router();
  router.use(requireAuth);

  router.post("/upload/metadata", metadataLimiter, (req, res) => {
    res.json({
      message: "Upload metadata normalized",
      file: normalizeUploadMetadata(getRequestBody(req)?.file)
    });
  });

  return router;
}
