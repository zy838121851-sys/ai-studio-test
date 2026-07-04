import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-api-credits-ledger-"));
process.env.DB_PATH = join(tempRoot, "api-credits-ledger.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = "mock";
process.env.APIMART_MOCK = "true";

let server = null;
let closeDatabaseRef = null;
const restoreConsole = suppressAuditLogs();

try {
  const { createServer } = await import("../src/server/index.js");
  const { closeDatabase } = await import("../src/server/db/sqlite.js");
  const { normalizePaginationLimit, normalizePaginationOffset } = await import("../src/server/lib/api-pagination.js");
  const { completeAIJob, createAIJob, failAIJob } = await import("../src/server/services/ai-job.service.js");
  const { getCreditBalance, reserveCredits } = await import("../src/server/services/credits/credit.service.js");

  assert(normalizePaginationLimit("2.2", { fallback: 50, max: 100 }) === 3, "Pagination limit should round up numeric input");
  assert(normalizePaginationLimit("bad", { fallback: 50, max: 100 }) === 50, "Pagination limit should fall back for invalid input");
  assert(normalizePaginationLimit("1000", { fallback: 50, max: 100 }) === 100, "Pagination limit should clamp max");
  assert(normalizePaginationOffset("-5") === 0, "Pagination offset should clamp negative values");
  assert(normalizePaginationOffset("bad") === 0, "Pagination offset should fall back for invalid input");

  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await assertProtected(baseUrl, "/api/credits/balance");
  await assertProtected(baseUrl, "/api/credits/transactions");

  const userA = await register(baseUrl, "api-credits-a@example.com", "API Credits A");
  const userB = await register(baseUrl, "api-credits-b@example.com", "API Credits B");

  const initialA = await getBalance(baseUrl, userA.cookie);
  const initialB = await getBalance(baseUrl, userB.cookie);
  assert(initialA.userId === userA.user.id, "Credit balance should identify the authenticated user");
  assert(initialB.userId === userB.user.id, "Other user credit balance should identify that user");
  assert(initialA.balanceCredits === 500, "New user A should start with default credits");
  assert(initialB.balanceCredits === 500, "New user B should start with default credits");
  assert(initialA.reservedCredits === 0, "New user A should start with no reserved credits");
  assert(initialA.availableCredits === 500, "New user A available credits should match balance");

  const successJobId = "api-credits-ledger-success";
  reserveCredits({
    userId: userA.user.id,
    amount: 25,
    provider: "test",
    model: "credits-ledger",
    task: "image_generation",
    billingType: "fixed",
    reason: "credits_ledger_success_reserve",
    requestId: successJobId
  });
  const afterReserve = getCreditBalance(userA.user.id);
  assert(afterReserve.balanceCredits === 500, "Reserve should not deduct credit balance");
  assert(afterReserve.reservedCredits === 25, "Reserve should increase reserved credits");
  assert(afterReserve.availableCredits === 475, "Reserve should reduce available credits");

  createAIJob({
    id: successJobId,
    userId: userA.user.id,
    provider: "test",
    vendor: "test",
    modelId: "credits-ledger",
    providerModel: "credits-ledger",
    type: "image",
    status: "running",
    progress: 50,
    prompt: "credits ledger success",
    creditsReserved: 25
  });
  const completed = await completeAIJob(userA.user.id, successJobId, {
    outputs: [{ url: "mock://credits-ledger-success.png", mimeType: "image/png" }],
    responseData: { status: "succeeded" },
    durationMs: 100
  });
  assert(completed?.status === "succeeded", "Successful credited AI job should complete");

  const afterCharge = await getBalance(baseUrl, userA.cookie);
  assert(afterCharge.balanceCredits === 475, "Successful AI job should deduct charged credits");
  assert(afterCharge.reservedCredits === 0, "Successful AI job should clear reserved credits");
  assert(afterCharge.availableCredits === 475, "Successful AI job available credits should match final balance");

  const failureJobId = "api-credits-ledger-failure";
  reserveCredits({
    userId: userA.user.id,
    amount: 30,
    provider: "test",
    model: "credits-ledger",
    task: "image_generation",
    billingType: "fixed",
    reason: "credits_ledger_failure_reserve",
    requestId: failureJobId
  });
  const afterFailureReserve = getCreditBalance(userA.user.id);
  assert(afterFailureReserve.balanceCredits === 475, "Failed-job reserve should not deduct balance before failure");
  assert(afterFailureReserve.reservedCredits === 30, "Failed-job reserve should increase reserved credits");

  createAIJob({
    id: failureJobId,
    userId: userA.user.id,
    provider: "test",
    vendor: "test",
    modelId: "credits-ledger",
    providerModel: "credits-ledger",
    type: "image",
    status: "running",
    progress: 30,
    prompt: "credits ledger failure",
    creditsReserved: 30
  });
  const failed = failAIJob(userA.user.id, failureJobId, {
    status: "failed",
    errorCode: "PROVIDER_FAILED",
    errorMessage: "provider failed",
    responseData: { status: "failed" },
    durationMs: 200
  });
  assert(failed?.status === "failed", "Failed credited AI job should be marked failed");

  const afterRelease = await getBalance(baseUrl, userA.cookie);
  assert(afterRelease.balanceCredits === 475, "Failed AI job should not deduct balance");
  assert(afterRelease.reservedCredits === 0, "Failed AI job should release reserved credits");
  assert(afterRelease.availableCredits === 475, "Failed AI job should restore available credits");

  const userATransactions = await getTransactions(baseUrl, userA.cookie, 100);
  assert(findTransaction(userATransactions, "reserve", successJobId, 25, "reserved"), "User A ledger should include success reserve");
  assert(findTransaction(userATransactions, "charge", successJobId, 25, "charged"), "User A ledger should include success charge");
  assert(findTransaction(userATransactions, "reserve", failureJobId, 30, "reserved"), "User A ledger should include failure reserve");
  assert(findTransaction(userATransactions, "release", failureJobId, 30, "failed"), "User A ledger should include failure release");

  const userBTransactions = await getTransactions(baseUrl, userB.cookie, 100);
  assert(
    userBTransactions.every((transaction) => (
      transaction.requestId !== successJobId
      && transaction.requestId !== failureJobId
    )),
    "Other users should not see owner credit transactions"
  );

  const finalB = await getBalance(baseUrl, userB.cookie);
  assert(finalB.balanceCredits === 500, "Other user balance should not change after user A credits flow");
  assert(finalB.reservedCredits === 0, "Other user reserved credits should not change after user A credits flow");

  const limited = await getTransactions(baseUrl, userA.cookie, 1);
  assert(limited.length === 1, "Credit transaction API should honor small limits");
  assert(typeof limited[0].createdAt === "number", "Credit transactions should expose createdAt");
  assert(typeof limited[0].balanceAfter === "number", "Credit transactions should expose balanceAfter");
  assert(typeof limited[0].reservedAfter === "number", "Credit transactions should expose reservedAfter");

  const invalidPagination = await getTransactionsByPath(baseUrl, userA.cookie, "/api/credits/transactions?limit=bad&offset=bad");
  assert(invalidPagination.length >= 4, "Credit transaction API should use stable pagination defaults for invalid query values");

  console.log("API credits ledger checks passed.");
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

async function getBalance(baseUrl, cookie) {
  const response = await request(baseUrl, "/api/credits/balance", { cookie });
  assert(response.status === 200, "Credit balance API should succeed for authenticated users");
  assert(response.body.balance, "Credit balance API should return a balance object");
  return response.body.balance;
}

async function getTransactions(baseUrl, cookie, limit) {
  return getTransactionsByPath(baseUrl, cookie, `/api/credits/transactions?limit=${limit}`);
}

async function getTransactionsByPath(baseUrl, cookie, path) {
  const response = await request(baseUrl, path, { cookie });
  assert(response.status === 200, "Credit transactions API should succeed for authenticated users");
  assert(Array.isArray(response.body.transactions), "Credit transactions API should return a transactions array");
  return response.body.transactions;
}

function findTransaction(transactions, type, requestId, amountCredits, status) {
  return transactions.some((transaction) => (
    transaction.type === type
    && transaction.requestId === requestId
    && Number(transaction.amountCredits) === amountCredits
    && transaction.status === status
  ));
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
