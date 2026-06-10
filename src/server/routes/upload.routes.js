import { Router } from "express";
import { normalizeUploadMetadata } from "../services/upload.service.js";

export function createUploadRouter() {
  const router = Router();

  router.post("/upload/metadata", (req, res) => {
    res.json({
      message: "Upload metadata normalized",
      file: normalizeUploadMetadata(req.body?.file)
    });
  });

  return router;
}
