import { Router } from "express";
import { sendCaughtErrorResponse, sendErrorResponse } from "../lib/http-error-response.js";
import { getRequestContext } from "../lib/request-auth.js";
import { getRequestBody, getRouteParam } from "../lib/route-request.js";
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

function sendCollectionNotFound(res) {
  sendErrorResponse(res, 404, "Asset collection not found");
}

function readAssetCollectionRouteInput(req) {
  return {
    context: getRequestContext(req),
    collectionId: getRouteParam(req, "id"),
    body: getRequestBody(req)
  };
}

export function createAssetCollectionRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/asset-collections", (req, res) => {
    const { context } = readAssetCollectionRouteInput(req);
    res.json({ collections: listAssetCollections(context) });
  });

  router.post("/asset-collections", (req, res) => {
    try {
      const { context, body } = readAssetCollectionRouteInput(req);
      const collection = createAssetCollection(context, body);
      res.status(201).json({ collection });
    } catch (error) {
      handleCollectionError(res, error);
    }
  });

  router.patch("/asset-collections/:id", (req, res) => {
    try {
      const { context, collectionId, body } = readAssetCollectionRouteInput(req);
      const collection = updateAssetCollection(context, collectionId, body);
      if (!collection) {
        sendCollectionNotFound(res);
        return;
      }
      res.json({ collection });
    } catch (error) {
      handleCollectionError(res, error);
    }
  });

  router.delete("/asset-collections/:id", (req, res) => {
    const { context, collectionId } = readAssetCollectionRouteInput(req);
    const collection = deleteAssetCollection(context, collectionId);
    if (!collection) {
      sendCollectionNotFound(res);
      return;
    }
    res.json({ collection });
  });

  router.get("/asset-collections/:id/assets", (req, res) => {
    const { context, collectionId } = readAssetCollectionRouteInput(req);
    const assets = listAssetsForCollection(context, collectionId);
    if (!assets) {
      sendCollectionNotFound(res);
      return;
    }
    res.json({ assets });
  });

  return router;
}
