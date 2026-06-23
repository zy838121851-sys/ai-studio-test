import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createAssetCollection,
  deleteAssetCollection,
  listAssetCollections,
  updateAssetCollection
} from "../services/asset-collection.service.js";
import { listAssetsForCollection } from "../services/asset.service.js";

function userIdFromRequest(req) {
  return req.auth.user.id;
}

function handleCollectionError(res, error) {
  res.status(error.status || 400).json({
    message: error.status ? error.message : (error.message || "Asset collection request failed")
  });
}

export function createAssetCollectionRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/asset-collections", (req, res) => {
    res.json({ collections: listAssetCollections(userIdFromRequest(req)) });
  });

  router.post("/asset-collections", (req, res) => {
    try {
      const collection = createAssetCollection(userIdFromRequest(req), req.body);
      res.status(201).json({ collection });
    } catch (error) {
      handleCollectionError(res, error);
    }
  });

  router.patch("/asset-collections/:id", (req, res) => {
    try {
      const collection = updateAssetCollection(userIdFromRequest(req), req.params.id, req.body);
      if (!collection) {
        res.status(404).json({ message: "Asset collection not found" });
        return;
      }
      res.json({ collection });
    } catch (error) {
      handleCollectionError(res, error);
    }
  });

  router.delete("/asset-collections/:id", (req, res) => {
    const collection = deleteAssetCollection(userIdFromRequest(req), req.params.id);
    if (!collection) {
      res.status(404).json({ message: "Asset collection not found" });
      return;
    }
    res.json({ collection });
  });

  router.get("/asset-collections/:id/assets", (req, res) => {
    const assets = listAssetsForCollection(userIdFromRequest(req), req.params.id);
    if (!assets) {
      res.status(404).json({ message: "Asset collection not found" });
      return;
    }
    res.json({ assets });
  });

  return router;
}
