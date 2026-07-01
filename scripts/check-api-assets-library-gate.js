import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-assets-library-gate-"));
process.env.DB_PATH = join(tempRoot, "api-assets-library-gate.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";

let server = null;
let closeDatabaseRef = null;
const restoreConsole = suppressAuditLogs();

try {
  const { createServer } = await import("../src/server/index.js");
  const { closeDatabase } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await assertProtected(baseUrl, "/api/assets");
  await assertProtected(baseUrl, "/api/asset-collections");

  const userA = await register(baseUrl, "api-assets-a@example.com", "API Assets A");
  const userB = await register(baseUrl, "api-assets-b@example.com", "API Assets B");
  const projectA = await createProject(baseUrl, userA.cookie, "Asset library project A");
  const projectB = await createProject(baseUrl, userB.cookie, "Asset library project B");

  const missingGeneratedUrl = await request(baseUrl, "/api/assets/generated", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Missing generated URL"
    }
  });
  assert(missingGeneratedUrl.status === 400, "Generated asset without URL should return 400");
  assert(missingGeneratedUrl.body.message === "Generated asset URL is required", "Generated asset missing URL should keep the error contract");

  const missingCollectionName = await request(baseUrl, "/api/asset-collections", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      name: "   "
    }
  });
  assert(missingCollectionName.status === 400, "Collection without name should return 400");
  assert(missingCollectionName.body.message === "Collection name is required", "Collection missing name should keep the error contract");

  const collectionA = await request(baseUrl, "/api/asset-collections", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      name: "  Owner Collection  "
    }
  });
  assert(collectionA.status === 201, "Owner should be able to create an asset collection");
  assert(collectionA.body.collection?.id, "Collection create should return an id");
  assert(collectionA.body.collection.userId === userA.user.id, "Collection should stay scoped to the authenticated user");
  assert(collectionA.body.collection.name === "Owner Collection", "Collection create should normalize name whitespace");
  assert(collectionA.body.collection.assetCount === 0, "New collection should start empty");
  const collectionId = collectionA.body.collection.id;

  const crossCollectionPatch = await request(baseUrl, `/api/asset-collections/${collectionId}`, {
    method: "PATCH",
    cookie: userB.cookie,
    body: {
      name: "cross-user patch"
    }
  });
  assert(crossCollectionPatch.status === 404, "Other users should not update owner collections");
  assert(crossCollectionPatch.body.message === "Asset collection not found", "Cross-user collection update should keep the not-found contract");

  const crossCollectionAssets = await request(baseUrl, `/api/asset-collections/${collectionId}/assets`, { cookie: userB.cookie });
  assert(crossCollectionAssets.status === 404, "Other users should not list owner collection assets");
  assert(crossCollectionAssets.body.message === "Asset collection not found", "Cross-user collection asset list should keep the not-found contract");

  const hiddenAsset = await createGeneratedAsset(baseUrl, userA.cookie, {
    url: "/uploads/hidden.png",
    title: "Hidden generated asset",
    type: "image",
    mimeType: "image/png",
    sizeBytes: 12,
    libraryVisible: false
  });
  assert(hiddenAsset.libraryVisible === false, "Generated asset should preserve hidden library visibility");

  const visibleAsset = await createGeneratedAsset(baseUrl, userA.cookie, {
    url: "/uploads/visible.png",
    thumbnailUrl: "/uploads/visible-thumb.png",
    title: "Visible generated asset",
    type: "image",
    mimeType: "image/png",
    sizeBytes: 34,
    width: 128,
    height: 64,
    prompt: "visible prompt",
    modelName: "asset-gate-model",
    projectId: projectA.id,
    collectionId,
    collection: "Owner Collection",
    libraryVisible: true
  });
  assert(visibleAsset.userId === userA.user.id, "Generated asset should stay scoped to the authenticated user");
  assert(visibleAsset.projectId === projectA.id, "Generated asset should link to an owner project");
  assert(visibleAsset.collectionId === collectionId, "Generated asset should link to an owner collection");
  assert(visibleAsset.collectionName === "Owner Collection", "Generated asset should expose collection name");
  assert(visibleAsset.libraryVisible === true, "Generated asset should be visible when requested");

  const crossProjectAsset = await createGeneratedAsset(baseUrl, userA.cookie, {
    url: "/uploads/cross-project.png",
    title: "Cross project generated asset",
    type: "image",
    mimeType: "image/png",
    sizeBytes: 1,
    projectId: projectB.id,
    collectionId,
    libraryVisible: true
  });
  assert(crossProjectAsset.projectId === "", "Generated assets should not link projects owned by another user");
  assert(crossProjectAsset.collectionId === collectionId, "Generated asset should still link owner collection when project is rejected");

  const listA = await request(baseUrl, "/api/assets", { cookie: userA.cookie });
  assert(listA.status === 200, "Owner asset list should succeed");
  assert(listA.body.assets.some((asset) => asset.id === visibleAsset.id), "Owner asset list should include visible assets");
  assert(listA.body.assets.some((asset) => asset.id === crossProjectAsset.id), "Owner asset list should include visible assets without project links");
  assert(listA.body.assets.every((asset) => asset.id !== hiddenAsset.id), "Owner asset list should hide library-invisible assets");

  const listB = await request(baseUrl, "/api/assets", { cookie: userB.cookie });
  assert(listB.status === 200, "Other user asset list should succeed");
  assert(listB.body.assets.every((asset) => asset.id !== visibleAsset.id), "Other user asset list should not include owner assets");

  const projectAssets = await request(baseUrl, `/api/assets?projectId=${projectA.id}`, { cookie: userA.cookie });
  assert(projectAssets.status === 200, "Owner project asset list should succeed");
  assert(projectAssets.body.assets.some((asset) => asset.id === visibleAsset.id), "Owner project asset list should include linked assets");
  assert(projectAssets.body.assets.every((asset) => asset.id !== crossProjectAsset.id), "Owner project asset list should exclude assets not linked to that project");

  const collectionAssets = await request(baseUrl, `/api/asset-collections/${collectionId}/assets`, { cookie: userA.cookie });
  assert(collectionAssets.status === 200, "Owner collection assets should succeed");
  assert(collectionAssets.body.assets.some((asset) => asset.id === visibleAsset.id), "Owner collection assets should include visible assets");
  assert(collectionAssets.body.assets.some((asset) => asset.id === crossProjectAsset.id), "Owner collection assets should include visible collection assets");
  assert(collectionAssets.body.assets.every((asset) => asset.id !== hiddenAsset.id), "Owner collection assets should hide library-invisible assets");

  const collectionsAfterAssets = await request(baseUrl, "/api/asset-collections", { cookie: userA.cookie });
  assert(collectionsAfterAssets.status === 200, "Owner collection list should succeed");
  const populatedCollection = collectionsAfterAssets.body.collections.find((collection) => collection.id === collectionId);
  assert(populatedCollection?.assetCount === 2, "Collection count should include visible assets only");
  assert(populatedCollection.coverUrl === "/uploads/cross-project.png", "Collection cover should use the latest visible asset");

  const ownerGet = await request(baseUrl, `/api/assets/${visibleAsset.id}`, { cookie: userA.cookie });
  assert(ownerGet.status === 200, "Owner should be able to read own asset");
  assert(ownerGet.body.asset.id === visibleAsset.id, "Owner asset read should return requested asset");

  const otherGet = await request(baseUrl, `/api/assets/${visibleAsset.id}`, { cookie: userB.cookie });
  assert(otherGet.status === 404, "Other users should not read owner assets");
  assert(otherGet.body.message === "Asset not found", "Cross-user asset read should keep the not-found contract");

  await assertAssetMutationBlocked(baseUrl, userB.cookie, visibleAsset.id, collectionId, projectB.id);

  const updatedCollection = await request(baseUrl, `/api/asset-collections/${collectionId}`, {
    method: "PATCH",
    cookie: userA.cookie,
    body: {
      name: "Renamed Collection"
    }
  });
  assert(updatedCollection.status === 200, "Owner should be able to rename own collection");
  assert(updatedCollection.body.collection.name === "Renamed Collection", "Collection rename should persist");

  const updatedAsset = await request(baseUrl, `/api/assets/${visibleAsset.id}`, {
    method: "PATCH",
    cookie: userA.cookie,
    body: {
      title: "Updated visible asset",
      prompt: "updated prompt",
      modelName: "updated-model",
      collection: "Manual label",
      libraryVisible: false
    }
  });
  assert(updatedAsset.status === 200, "Owner should be able to update own asset");
  assert(updatedAsset.body.asset.title === "Updated visible asset", "Asset update should persist title");
  assert(updatedAsset.body.asset.prompt === "updated prompt", "Asset update should persist prompt");
  assert(updatedAsset.body.asset.modelName === "updated-model", "Asset update should persist model name");
  assert(updatedAsset.body.asset.collection === "Manual label", "Asset update should persist manual collection label");
  assert(updatedAsset.body.asset.libraryVisible === false, "Asset update should persist visibility changes");

  const visibleAfterHide = await request(baseUrl, "/api/assets", { cookie: userA.cookie });
  assert(visibleAfterHide.body.assets.every((asset) => asset.id !== visibleAsset.id), "Hidden updated assets should disappear from the library list");

  const movedBack = await request(baseUrl, `/api/assets/${visibleAsset.id}/move-to-collection`, {
    method: "POST",
    cookie: userA.cookie,
    body: {
      collectionId
    }
  });
  assert(movedBack.status === 200, "Owner should be able to move own asset to own collection");
  assert(movedBack.body.asset.collectionId === collectionId, "Move to collection should preserve collectionId");
  assert(movedBack.body.asset.libraryVisible === true, "Move to collection should make the asset library-visible");

  const addedToProject = await request(baseUrl, `/api/assets/${visibleAsset.id}/add-to-project`, {
    method: "POST",
    cookie: userA.cookie,
    body: {
      projectId: projectA.id
    }
  });
  assert(addedToProject.status === 200, "Owner should be able to add own asset to own project");
  assert(addedToProject.body.asset.projectId === projectA.id, "Add to project should expose the linked project");

  const crossAddProject = await request(baseUrl, `/api/assets/${visibleAsset.id}/add-to-project`, {
    method: "POST",
    cookie: userA.cookie,
    body: {
      projectId: projectB.id
    }
  });
  assert(crossAddProject.status === 404, "Owner should not add assets to another user's project");
  assert(crossAddProject.body.message === "Project not found", "Cross-user project link should keep the not-found contract");

  const deletedCollection = await request(baseUrl, `/api/asset-collections/${collectionId}`, {
    method: "DELETE",
    cookie: userA.cookie
  });
  assert(deletedCollection.status === 200, "Owner should be able to delete own collection");
  assert(deletedCollection.body.collection.id === collectionId, "Collection delete should return deleted collection");
  assert(typeof deletedCollection.body.collection.deletedAt === "number", "Collection delete should expose deletedAt");

  const collectionAfterDelete = await request(baseUrl, `/api/asset-collections/${collectionId}/assets`, { cookie: userA.cookie });
  assert(collectionAfterDelete.status === 404, "Deleted collection assets endpoint should return 404");

  const assetAfterCollectionDelete = await request(baseUrl, `/api/assets/${visibleAsset.id}`, { cookie: userA.cookie });
  assert(assetAfterCollectionDelete.status === 200, "Deleting a collection should not delete its assets");
  assert(assetAfterCollectionDelete.body.asset.collectionId === "", "Deleting a collection should unlink assets from the collection");
  assert(assetAfterCollectionDelete.body.asset.collection === "", "Deleting a collection should clear legacy collection label");

  const deletedAsset = await request(baseUrl, `/api/assets/${visibleAsset.id}`, {
    method: "DELETE",
    cookie: userA.cookie
  });
  assert(deletedAsset.status === 200, "Owner should be able to delete own asset");
  assert(deletedAsset.body.asset.id === visibleAsset.id, "Asset delete should return deleted asset");
  assert(typeof deletedAsset.body.asset.deletedAt === "number", "Asset delete should expose deletedAt");

  const getDeletedAsset = await request(baseUrl, `/api/assets/${visibleAsset.id}`, { cookie: userA.cookie });
  assert(getDeletedAsset.status === 404, "Deleted assets should not be readable");

  const listAfterAssetDelete = await request(baseUrl, "/api/assets", { cookie: userA.cookie });
  assert(listAfterAssetDelete.body.assets.every((asset) => asset.id !== visibleAsset.id), "Deleted assets should not appear in owner list");

  const secondAssetDelete = await request(baseUrl, `/api/assets/${visibleAsset.id}`, {
    method: "DELETE",
    cookie: userA.cookie
  });
  assert(secondAssetDelete.status === 404, "Deleting an already deleted asset should return 404");

  const collectionB = await request(baseUrl, "/api/asset-collections", {
    method: "POST",
    cookie: userB.cookie,
    body: {
      name: "Other user collection"
    }
  });
  assert(collectionB.status === 201, "Other user should still be able to create own collections");
  assert(collectionB.body.collection.userId === userB.user.id, "Other user's collection should stay scoped to that user");

  console.log("API assets library gate checks passed.");
} finally {
  restoreConsole();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function suppressAuditLogs() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => {
    if (String(args[0] || "").startsWith("[info] audit:")) return;
    originalLog(...args);
  };
  console.warn = (...args) => {
    if (String(args[0] || "").startsWith("[warn] audit:")) return;
    originalWarn(...args);
  };
  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
  };
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });
}

async function assertProtected(baseUrl, path) {
  const response = await request(baseUrl, path);
  assert(response.status === 401, `${path} should require authentication`);
  assert(response.body.message === "Authentication required", `${path} should return the auth error contract`);
}

async function register(baseUrl, email, name) {
  const response = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email,
      password: "password123",
      name
    }
  });
  assert(response.status === 201, `${email} registration should succeed`);
  assert(response.cookie, `${email} registration should set a session cookie`);
  return {
    user: response.body.user,
    cookie: response.cookie
  };
}

async function createProject(baseUrl, cookie, title) {
  const response = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie,
    body: {
      title,
      prompt: "asset library gate",
      itemCount: 1,
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(response.status === 201, "Project creation should succeed");
  assert(response.body.project?.id, "Project creation should return an id");
  return response.body.project;
}

async function createGeneratedAsset(baseUrl, cookie, body) {
  const response = await request(baseUrl, "/api/assets/generated", {
    method: "POST",
    cookie,
    body
  });
  assert(response.status === 201, "Generated asset creation should succeed");
  assert(response.body.asset?.id, "Generated asset creation should return an id");
  return response.body.asset;
}

async function assertAssetMutationBlocked(baseUrl, cookie, assetId, collectionId, projectId) {
  const patch = await request(baseUrl, `/api/assets/${assetId}`, {
    method: "PATCH",
    cookie,
    body: {
      title: "cross-user patch"
    }
  });
  assert(patch.status === 404, "Other users should not update owner assets");
  assert(patch.body.message === "Asset not found", "Cross-user asset patch should keep the not-found contract");

  const remove = await request(baseUrl, `/api/assets/${assetId}`, {
    method: "DELETE",
    cookie
  });
  assert(remove.status === 404, "Other users should not delete owner assets");
  assert(remove.body.message === "Asset not found", "Cross-user asset delete should keep the not-found contract");

  const move = await request(baseUrl, `/api/assets/${assetId}/move-to-collection`, {
    method: "POST",
    cookie,
    body: {
      collectionId
    }
  });
  assert(move.status === 404, "Other users should not move owner assets to collections");
  assert(move.body.message === "Asset not found", "Cross-user asset move should keep the not-found contract");

  const addToProject = await request(baseUrl, `/api/assets/${assetId}/add-to-project`, {
    method: "POST",
    cookie,
    body: {
      projectId
    }
  });
  assert(addToProject.status === 404, "Other users should not add owner assets to projects");
  assert(addToProject.body.message === "Asset not found", "Cross-user add-to-project should keep the not-found contract");
}

async function request(baseUrl, path, {
  method = "GET",
  cookie = "",
  body
} = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  const setCookies = response.headers.getSetCookie?.() || [];
  const setCookie = setCookies[0] || response.headers.get("set-cookie") || "";
  return {
    status: response.status,
    cookie: setCookie.split(";")[0],
    body: text ? JSON.parse(text) : null
  };
}
