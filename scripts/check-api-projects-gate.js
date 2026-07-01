import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-projects-gate-"));
process.env.DB_PATH = join(tempRoot, "api-projects-gate.sqlite");
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

  await assertProtected(baseUrl, "/api/projects");

  const userA = await register(baseUrl, "api-projects-a@example.com", "API Projects A");
  const userB = await register(baseUrl, "api-projects-b@example.com", "API Projects B");

  const invalidSnapshot = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Invalid snapshot project",
      canvasSnapshotJson: "{invalid"
    }
  });
  assert(invalidSnapshot.status === 400, "Invalid project snapshot JSON should return 400");
  assert(invalidSnapshot.body.message === "Invalid canvas snapshot JSON", "Invalid snapshot should keep the error contract");

  const projectA = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "  Owner project  ",
      prompt: " owner prompt ",
      thumbnail: "http://localhost:3000/uploads/owner.png?cache=1",
      itemCount: 2,
      canvasSnapshotJson: JSON.stringify({
        version: 1,
        savedAt: 1000,
        nodes: [
          {
            id: "node-a",
            kind: "image",
            title: "Node A",
            html: "<div onclick=\"alert(1)\"><script>alert(1)</script>safe</div>",
            style: "color:red; width:10px; background:url(javascript:alert(1));",
            dataset: {
              safeId: "safe",
              onerror: "alert(1)",
              link: "javascript:alert(1)"
            },
            media: {
              url: "javascript:alert(1)",
              name: "owner image",
              type: "image/png"
            },
            x: 10,
            y: 20
          },
          {
            id: "node-b",
            kind: "text",
            title: "Node B",
            html: "<p>text</p>",
            x: "not-a-number",
            y: 5
          }
        ]
      })
    }
  });
  assert(projectA.status === 201, "Owner should be able to create a project");
  assert(projectA.body.project?.id, "Project create should return an id");
  assert(projectA.body.project.userId === userA.user.id, "Project should stay scoped to the authenticated user");
  assert(projectA.body.project.title === "Owner project", "Project create should normalize title whitespace");
  assert(projectA.body.project.prompt === "owner prompt", "Project create should normalize prompt whitespace");
  assert(projectA.body.project.thumbnail === "/uploads/owner.png", "Project create should normalize local upload thumbnails");
  assert(projectA.body.project.itemCount === 2, "Project create should preserve item count");

  const projectId = projectA.body.project.id;
  const createdSnapshot = parseSnapshot(projectA.body.project.canvasSnapshotJson);
  assert(createdSnapshot.nodes.length === 2, "Project create should persist snapshot nodes");
  assert(createdSnapshot.nodes[0].html === "<div>safe</div>", "Project snapshot HTML should be sanitized");
  assert(!createdSnapshot.nodes[0].style.includes("javascript:"), "Project snapshot style should remove javascript URLs");
  assert(createdSnapshot.nodes[0].dataset.safeId === "safe", "Project snapshot dataset should preserve safe keys");
  assert(createdSnapshot.nodes[0].dataset.onerror === undefined, "Project snapshot dataset should remove event keys");
  assert(createdSnapshot.nodes[0].dataset.link === "", "Project snapshot dataset should clear dangerous URLs");
  assert(createdSnapshot.nodes[0].media.url === "", "Project snapshot media should clear dangerous URLs");
  assert(createdSnapshot.nodes[1].x === 0, "Project snapshot should normalize invalid coordinates");

  const userAList = await request(baseUrl, "/api/projects", { cookie: userA.cookie });
  assert(userAList.status === 200, "Owner project list should succeed");
  assert(userAList.body.projects.some((project) => project.id === projectId), "Owner project list should include own project");
  assert(
    userAList.body.projects.every((project) => project.canvasSnapshotJson === undefined),
    "Project list should not include snapshot payloads"
  );

  const userBList = await request(baseUrl, "/api/projects", { cookie: userB.cookie });
  assert(userBList.status === 200, "Other user project list should succeed");
  assert(userBList.body.projects.every((project) => project.id !== projectId), "Other user project list should not include owner projects");

  const ownerGet = await request(baseUrl, `/api/projects/${projectId}`, { cookie: userA.cookie });
  assert(ownerGet.status === 200, "Owner should be able to read own project");
  assert(ownerGet.body.project.id === projectId, "Owner project read should return requested project");
  assert(ownerGet.body.project.canvasSnapshotJson === projectA.body.project.canvasSnapshotJson, "Owner project read should include current snapshot");
  assert(typeof ownerGet.body.project.lastOpenedAt === "number", "Owner project read should expose lastOpenedAt");

  const otherGet = await request(baseUrl, `/api/projects/${projectId}`, { cookie: userB.cookie });
  assert(otherGet.status === 404, "Other users should not read owner projects");
  assert(otherGet.body.message === "Project not found", "Cross-user project read should keep the not-found contract");

  await assertProjectMutationBlocked(baseUrl, userB.cookie, projectId);

  const patched = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "PATCH",
    cookie: userA.cookie,
    body: {
      title: "Patched project",
      prompt: "patched prompt",
      thumbnail: "/uploads/patched.png",
      itemCount: 4,
      canvasSnapshotJson: JSON.stringify({
        version: 2,
        savedAt: 2000,
        nodes: [
          {
            id: "patched-node",
            kind: "image",
            title: "Patched",
            html: "<strong>patched</strong>",
            x: 1,
            y: 2
          }
        ]
      })
    }
  });
  assert(patched.status === 200, "Owner should be able to patch own project");
  assert(patched.body.project.title === "Patched project", "Project patch should update title");
  assert(patched.body.project.prompt === "patched prompt", "Project patch should update prompt");
  assert(patched.body.project.thumbnail === "/uploads/patched.png", "Project patch should update thumbnail");
  assert(patched.body.project.itemCount === 4, "Project patch should update item count");
  assert(parseSnapshot(patched.body.project.canvasSnapshotJson).nodes.length === 1, "Project patch should replace current snapshot");

  const saved = await request(baseUrl, `/api/projects/${projectId}/save-canvas`, {
    method: "POST",
    cookie: userA.cookie,
    body: {
      title: "Saved canvas project",
      prompt: "saved prompt",
      thumbnail: "/uploads/saved.png",
      itemCount: 1,
      canvasSnapshotJson: JSON.stringify({
        version: 3,
        savedAt: 3000,
        nodes: [
          {
            id: "saved-node",
            kind: "image",
            title: "Saved",
            html: "<span>saved</span>",
            x: 3,
            y: 4
          }
        ]
      })
    }
  });
  assert(saved.status === 200, "Owner should be able to save canvas for own project");
  assert(saved.body.project.title === "Saved canvas project", "Save canvas should update title");
  assert(saved.body.project.itemCount === 1, "Save canvas should update item count");
  assert(parseSnapshot(saved.body.project.canvasSnapshotJson).nodes[0].id === "saved-node", "Save canvas should persist the new snapshot");

  const deleted = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "DELETE",
    cookie: userA.cookie
  });
  assert(deleted.status === 200, "Owner should be able to delete own project");
  assert(deleted.body.project.id === projectId, "Project delete should return deleted project");
  assert(typeof deleted.body.project.deletedAt === "number", "Project delete should expose deletedAt");

  const afterDeleteGet = await request(baseUrl, `/api/projects/${projectId}`, { cookie: userA.cookie });
  assert(afterDeleteGet.status === 404, "Deleted project should not be readable");

  const afterDeleteList = await request(baseUrl, "/api/projects", { cookie: userA.cookie });
  assert(afterDeleteList.status === 200, "Project list should succeed after delete");
  assert(afterDeleteList.body.projects.every((project) => project.id !== projectId), "Deleted project should not appear in owner list");

  const secondDelete = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "DELETE",
    cookie: userA.cookie
  });
  assert(secondDelete.status === 404, "Deleting an already deleted project should return 404");

  const projectB = await request(baseUrl, "/api/projects", {
    method: "POST",
    cookie: userB.cookie,
    body: {
      title: "Other user project",
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(projectB.status === 201, "Other user should still be able to create own projects");
  assert(projectB.body.project.userId === userB.user.id, "Other user's project should stay scoped to that user");

  console.log("API projects gate checks passed.");
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

async function assertProjectMutationBlocked(baseUrl, cookie, projectId) {
  const patch = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "PATCH",
    cookie,
    body: {
      title: "cross-user patch"
    }
  });
  assert(patch.status === 404, "Other users should not update owner projects");
  assert(patch.body.message === "Project not found", "Cross-user project patch should keep the not-found contract");

  const saveCanvas = await request(baseUrl, `/api/projects/${projectId}/save-canvas`, {
    method: "POST",
    cookie,
    body: {
      canvasSnapshotJson: JSON.stringify({ nodes: [] })
    }
  });
  assert(saveCanvas.status === 404, "Other users should not save canvas for owner projects");
  assert(saveCanvas.body.message === "Project not found", "Cross-user save canvas should keep the not-found contract");

  const remove = await request(baseUrl, `/api/projects/${projectId}`, {
    method: "DELETE",
    cookie
  });
  assert(remove.status === 404, "Other users should not delete owner projects");
  assert(remove.body.message === "Project not found", "Cross-user project delete should keep the not-found contract");
}

function parseSnapshot(value) {
  assert(value, "Project should expose canvasSnapshotJson");
  return JSON.parse(value);
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
