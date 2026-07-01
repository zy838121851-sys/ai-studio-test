import { Router } from "express";
import { env } from "../config/env.js";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestUserId } from "../lib/request-auth.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { createRateLimiter } from "../middleware/rate-limit.middleware.js";
import { recordAuditEvent } from "../services/audit.service.js";
import {
  addAssetToProject,
  createGeneratedAsset,
  createUploadedAsset,
  getAsset,
  listAssets,
  moveAssetToCollection,
  softDeleteAsset,
  updateAsset
} from "../services/asset.service.js";

const uploadLimiter = createRateLimiter({
  namespace: "asset-upload",
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many upload requests"
});

function handleAssetError(res, error) {
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 400,
    defaultMessage: "Asset request failed",
    useStatusMessageOnly: true
  });
}

export function createAssetRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/assets", (req, res) => {
    res.json({
      assets: listAssets(getRequestUserId(req), {
        projectId: req.query.projectId,
        collection: req.query.collection,
        collectionId: req.query.collectionId
      })
    });
  });

  router.post("/assets/upload", uploadLimiter, async (req, res) => {
    const userId = getRequestUserId(req);
    try {
      const multipart = await parseMultipartForm(req);
      const asset = createUploadedAsset(userId, multipart);
      recordAuditEvent(req, "asset.upload.succeeded", {
        outcome: "succeeded",
        userId,
        assetId: asset.id,
        type: asset.type,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes
      });
      res.status(201).json({ asset });
    } catch (error) {
      recordAuditEvent(req, "asset.upload.failed", {
        outcome: "failed",
        status: error.status || 500,
        userId
      });
      handleAssetError(res, error);
    }
  });

  router.post("/assets/generated", (req, res) => {
    try {
      const asset = createGeneratedAsset(getRequestUserId(req), req.body);
      res.status(201).json({ asset });
    } catch (error) {
      handleAssetError(res, error);
    }
  });

  router.get("/assets/:id", (req, res) => {
    const asset = getAsset(getRequestUserId(req), req.params.id);
    if (!asset) {
      sendErrorResponse(res, 404, "Asset not found");
      return;
    }
    res.json({ asset });
  });

  router.patch("/assets/:id", (req, res) => {
    try {
      const asset = updateAsset(getRequestUserId(req), req.params.id, req.body);
      if (!asset) {
        sendErrorResponse(res, 404, "Asset not found");
        return;
      }
      res.json({ asset });
    } catch (error) {
      handleAssetError(res, error);
    }
  });

  router.delete("/assets/:id", (req, res) => {
    const userId = getRequestUserId(req);
    const asset = softDeleteAsset(userId, req.params.id);
    if (!asset) {
      recordAuditEvent(req, "asset.delete.failed", {
        outcome: "failed",
        status: 404,
        userId,
        assetId: req.params.id
      });
      sendErrorResponse(res, 404, "Asset not found");
      return;
    }
    recordAuditEvent(req, "asset.delete.succeeded", {
      outcome: "succeeded",
      userId,
      assetId: asset.id,
      type: asset.type
    });
    res.json({ asset });
  });

  router.post("/assets/:id/add-to-project", (req, res) => {
    try {
      const asset = addAssetToProject(getRequestUserId(req), req.params.id, req.body);
      if (!asset) {
        sendErrorResponse(res, 404, "Asset not found");
        return;
      }
      res.json({ asset });
    } catch (error) {
      handleAssetError(res, error);
    }
  });

  router.post("/assets/:id/move-to-collection", (req, res) => {
    try {
      const asset = moveAssetToCollection(getRequestUserId(req), req.params.id, req.body);
      if (!asset) {
        sendErrorResponse(res, 404, "Asset not found");
        return;
      }
      res.json({ asset });
    } catch (error) {
      handleAssetError(res, error);
    }
  });

  return router;
}

async function parseMultipartForm(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) {
    const error = new Error("multipart/form-data is required");
    error.status = 400;
    throw error;
  }
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const buffer = await readRequestBuffer(req);
  const parts = splitMultipartBuffer(buffer, boundary);
  const fields = {};
  let file = null;

  parts.forEach((part) => {
    const parsed = parseMultipartPart(part);
    if (!parsed?.name) return;
    if (parsed.filename) {
      file = {
        filename: parsed.filename,
        mimeType: parsed.contentType || "application/octet-stream",
        buffer: parsed.body
      };
      return;
    }
    fields[parsed.name] = parsed.body.toString("utf8");
  });

  return { file, fields };
}

function readRequestBuffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let preview = Buffer.alloc(0);
    let maxBytes = env.maxUploadBytes;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (preview.length < MULTIPART_SNIFF_BYTES) {
        preview = Buffer.concat([preview, chunk]).subarray(0, MULTIPART_SNIFF_BYTES);
        if (isLikelyModel3DUpload(preview)) maxBytes = env.maxModelUploadBytes;
      }
      if (total > maxBytes) {
        const error = new Error("Upload is too large");
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const MULTIPART_SNIFF_BYTES = 64 * 1024;

function isLikelyModel3DUpload(buffer) {
  const text = buffer.toString("latin1");
  return /name="type"\s*(?:\r?\n){2}model3d(?:\r?\n|--)/i.test(text)
    || /content-type:\s*(?:model\/gltf-binary|model\/gltf\+json)\b/i.test(text)
    || /filename="[^"]+\.(?:glb|gltf|obj|stl)"/i.test(text);
}

function splitMultipartBuffer(buffer, boundary) {
  const parts = [];
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    start += boundary.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    const end = buffer.indexOf(boundary, start);
    if (end === -1) break;
    const part = buffer.subarray(start, end - 2);
    if (part.length) parts.push(part);
    start = end;
  }
  return parts;
}

function parseMultipartPart(part) {
  const separator = Buffer.from("\r\n\r\n");
  const splitAt = part.indexOf(separator);
  if (splitAt === -1) return null;
  const headerText = part.subarray(0, splitAt).toString("utf8");
  const body = part.subarray(splitAt + separator.length);
  const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || "";
  const name = disposition.match(/name="([^"]+)"/i)?.[1] || "";
  const filename = disposition.match(/filename="([^"]*)"/i)?.[1] || "";
  const contentType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || "";
  return { name, filename, contentType, body };
}
