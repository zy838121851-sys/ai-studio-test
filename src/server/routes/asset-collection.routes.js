import { Router } from "express";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestContext } from "../lib/request-auth.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createAssetCollection,
  deleteAssetCollection,
  listAssetCollections,
  updateAssetCollection
} from "../services/asset-collection.service.js";
import { listAssetsForCollection } from "../services/asset.service.js";

function handleCollectionError(res, error) {
  sendCaughtErrorResponse(res, error, {
    defaultStatus: 400,
    defaultMessage: "Asset collection request failed",
    useStatusMessageOnly: true
  });
}

export function createAssetCollectionRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/asset-collections", (req, res) => {
    res.json({ collections: listAssetCollections(getRequestContext(req)) });
  });

  router.post("/asset-collections", (req, res) => {
    try {
      const collection = createAssetCollection(getRequestContext(req), req.body);
      res.status(201).json({ collection });
    } catch (error) {
      handleCollectionError(res, error);
    }
  });

  router.patch("/asset-collections/:id", (req, res) => {
    try {
      const collection = updateAssetCollection(getRequestContext(req), req.params.id, req.body);
      if (!collection) {
        sendErrorResponse(res, 404, "Asset collection not found");
        return;
      }
      res.json({ collection });
    } catch (error) {
      handleCollectionError(res, error);
    }
  });

  router.delete("/asset-collections/:id", (req, res) => {
    const collection = deleteAssetCollection(getRequestContext(req), req.params.id);
    if (!collection) {
      sendErrorResponse(res, 404, "Asset collection not found");
      return;
    }
    res.json({ collection });
  });

  router.get("/asset-collections/:id/assets", (req, res) => {
    const assets = listAssetsForCollection(getRequestContext(req), req.params.id);
    if (!assets) {
      sendErrorResponse(res, 404, "Asset collection not found");
      return;
    }
    res.json({ assets });
  });

  return router;
}
