import { and, desc, eq } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { assetCollections, assets, uploads } from "../database/schema.js";

export class AssetService {
  constructor(private readonly database: RewriteDatabase) {}

  async list(context: AuthContext) {
    const rows = await this.database
      .select({ id: assets.id, collectionId: assets.collectionId, favorite: assets.favorite, uploadId: uploads.id, name: uploads.originalName, contentType: uploads.contentType, byteSize: uploads.byteSize, createdAt: assets.createdAt })
      .from(assets)
      .innerJoin(uploads, and(eq(uploads.id, assets.uploadId), eq(uploads.workspaceId, context.workspaceId)))
      .where(eq(assets.workspaceId, context.workspaceId))
      .orderBy(desc(assets.updatedAt));
    return rows.map((asset) => ({ ...asset, favorite: asset.favorite === 1, url: `/api/v1/uploads/${asset.uploadId}/content`, createdAt: asset.createdAt.toISOString() }));
  }

  async listCollections(context: AuthContext) {
    const rows = await this.database.select().from(assetCollections).where(eq(assetCollections.workspaceId, context.workspaceId)).orderBy(desc(assetCollections.updatedAt));
    return rows.map((collection) => ({ id: collection.id, name: collection.name, createdAt: collection.createdAt.toISOString(), updatedAt: collection.updatedAt.toISOString() }));
  }

  async createCollection(context: AuthContext, name: string) {
    const normalized = name.trim();
    if (!normalized || normalized.length > 120) throw new ApplicationError("INVALID_COLLECTION_NAME", 400, "Collection name is invalid.");
    const [collection] = await this.database.insert(assetCollections).values({ workspaceId: context.workspaceId, name: normalized }).returning();
    if (!collection) throw new ApplicationError("COLLECTION_CREATE_FAILED", 500, "Collection creation failed.");
    return { id: collection.id, name: collection.name, createdAt: collection.createdAt.toISOString(), updatedAt: collection.updatedAt.toISOString() };
  }

  async addUpload(context: AuthContext, uploadId: string) {
    const [upload] = await this.database.select({ id: uploads.id }).from(uploads).where(and(eq(uploads.id, uploadId), eq(uploads.workspaceId, context.workspaceId))).limit(1);
    if (!upload) throw new ApplicationError("UPLOAD_NOT_FOUND", 404, "Upload not found.");
    const [asset] = await this.database.insert(assets).values({ workspaceId: context.workspaceId, uploadId }).onConflictDoNothing().returning();
    return asset ? { id: asset.id } : null;
  }

  async update(context: AuthContext, assetId: string, input: { collectionId?: string | null; favorite?: boolean }) {
    if (input.collectionId) {
      const [collection] = await this.database.select({ id: assetCollections.id }).from(assetCollections).where(and(eq(assetCollections.id, input.collectionId), eq(assetCollections.workspaceId, context.workspaceId))).limit(1);
      if (!collection) throw new ApplicationError("COLLECTION_NOT_FOUND", 404, "Collection not found.");
    }
    const [asset] = await this.database.update(assets).set({ ...(input.collectionId !== undefined ? { collectionId: input.collectionId } : {}), ...(input.favorite !== undefined ? { favorite: input.favorite ? 1 : 0 } : {}), updatedAt: new Date() }).where(and(eq(assets.id, assetId), eq(assets.workspaceId, context.workspaceId))).returning();
    if (!asset) throw new ApplicationError("ASSET_NOT_FOUND", 404, "Asset not found.");
    return { id: asset.id, collectionId: asset.collectionId, favorite: asset.favorite === 1 };
  }

  async remove(context: AuthContext, assetId: string) {
    const [asset] = await this.database.delete(assets).where(and(eq(assets.id, assetId), eq(assets.workspaceId, context.workspaceId))).returning({ id: assets.id });
    if (!asset) throw new ApplicationError("ASSET_NOT_FOUND", 404, "Asset not found.");
    return { deleted: true as const };
  }
}
