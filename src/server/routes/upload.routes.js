import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { normalizeUploadMetadata } from "../services/upload.service.js";

export function createUploadRouter() {
  const router = Router();
  router.use(requireAuth);

  router.post("/upload/metadata", (req, res) => {
    res.json({
      message: "Upload metadata normalized",
      file: normalizeUploadMetadata(req.body?.file)
    });
  });

  return router;
}
