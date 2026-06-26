import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-credits-"));
process.env.DB_PATH = join(tempRoot, "credits.sqlite");
process.env.NODE_ENV = "test";
process.env.AUTH_CODE_PROVIDER = "mock";
let closeDatabaseRef = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { createServer } = await import("../src/server/index.js");
  const { execute, query, queryOne, sqlValue, closeDatabase, initializeDatabase } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;
  const { runCreditsMigration } = await import("../src/server/db/credits-migration.js");
  const { createUser, findUserByEmail } = await import("../src/server/auth/user.service.js");
  const { createSession, SESSION_COOKIE_NAME } = await import("../src/server/auth/session.js");
  const {
    addCredits,
    getCreditBalance,
    listCreditTransactions
  } = await import("../src/server/services/credits/credit.service.js");
  const { billFixedTask, billTokenTask } = await import("../src/server/services/credits/billing.service.js");

  initializeDatabase();
  const historicalUserId = randomUUID();
  execute(`
    INSERT INTO users (id, email, name, password_hash, password_salt, created_at, updated_at)
    VALUES (
      ${sqlValue(historicalUserId)},
      'historical@example.com',
      'Historical',
      '',
      '',
      ${Date.now()},
      ${Date.now()}
    );
  `);

  runCreditsMigration();
  runCreditsMigration();
  assert(getCreditBalance(historicalUserId).balanceCredits === 500, "Historical users should receive one initial grant");
  assert(
    query(`SELECT * FROM credit_transactions WHERE user_id = ${sqlValue(historicalUserId)} AND type = 'grant';`).length === 1,
    "Repeated migration must not duplicate initial grant"
  );

  const user = createUser({ email: "credits-user@example.com", password: "password123", name: "Credits User" });
  const other = createUser({ email: "other-user@example.com", password: "password123", name: "Other User" });
  assert(getCreditBalance(user.id).balanceCredits === 500, "New users should receive default credits");

  await checkCreditRoutes({ createServer, createSession, cookieName: SESSION_COOKIE_NAME, user, other });
  await checkFixedBilling({ userId: user.id, getCreditBalance, addCredits, billFixedTask });
  await checkTokenBilling({ userId: user.id, execute, sqlValue, getCreditBalance, addCredits, billTokenTask });
  await checkMissingAndInsufficientPricing({ userId: other.id, execute, getCreditBalance, billFixedTask });
  await checkAdminCommands({ dbPath: process.env.DB_PATH, findUserByEmail, addCredits, getCreditBalance });

  const fractionalRows = query(`
    SELECT balance_credits, reserved_credits FROM credit_accounts
    WHERE balance_credits != CAST(balance_credits AS INTEGER)
       OR reserved_credits != CAST(reserved_credits AS INTEGER);
  `);
  assert(fractionalRows.length === 0, "Credit account values must be integers");

  closeDatabase();
  console.log("Credit system checks passed.");
} finally {
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors in test teardown.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function checkCreditRoutes({ createServer, createSession, cookieName, user, other }) {
  const app = createServer();
  const server = await new Promise((resolve) => {
    const next = app.listen(0, "127.0.0.1", () => resolve(next));
  });
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const userCookie = `${cookieName}=${encodeURIComponent(createSession(user.id))}`;
    const otherCookie = `${cookieName}=${encodeURIComponent(createSession(other.id))}`;

    const balanceResponse = await fetch(`${baseUrl}/api/credits/balance`, {
      headers: { cookie: userCookie }
    });
    assert(balanceResponse.status === 200, "Balance route should require and accept auth");
    const balance = await balanceResponse.json();
    assert(balance.balance.userId === user.id, "Balance route should return only the authenticated user");

    const transactionsResponse = await fetch(`${baseUrl}/api/credits/transactions`, {
      headers: { cookie: otherCookie }
    });
    assert(transactionsResponse.status === 200, "Transactions route should return own transactions");
    const payload = await transactionsResponse.json();
    assert(
      payload.transactions.every((item) => item.requestId !== `initial-grant:${user.id}`),
      "Transactions route must not expose other users' rows"
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function checkFixedBilling({ userId, getCreditBalance, addCredits, billFixedTask }) {
  let calls = 0;
  const before = getCreditBalance(userId);
  const result = await billFixedTask({
    userId,
    provider: "qwen",
    model: "qwen-image-plus",
    task: "image_generation",
    callProvider: async () => {
      calls += 1;
      return { imageUrl: "mock://image", providerCalls: [{ provider: "qwen", model: "qwen-image-plus" }] };
    }
  });
  assert(calls === 1, "Fixed billing should call provider when credits are sufficient");
  assert(result.billing.creditsCharged === 12, "Qwen image generation should charge 12 credits");
  assert(getCreditBalance(userId).balanceCredits === before.balanceCredits - 12, "Fixed success should deduct credits");
  assert(getCreditBalance(userId).reservedCredits === 0, "Fixed success should clear reservation");

  addCredits(userId, { amount: 20, reason: "fixed_failure_test_topup" });
  const balanceBeforeFailure = getCreditBalance(userId).balanceCredits;
  try {
    await billFixedTask({
      userId,
      provider: "qwen",
      model: "qwen-image-plus",
      task: "image_generation",
      callProvider: async () => {
        throw new Error("fake provider failure");
      }
    });
    throw new Error("Expected fixed provider failure");
  } catch (error) {
    assert(error.message === "fake provider failure", "Fixed provider error should pass through");
  }
  assert(getCreditBalance(userId).balanceCredits === balanceBeforeFailure, "Fixed failure must not deduct credits");
  assert(getCreditBalance(userId).reservedCredits === 0, "Fixed failure should release reservation");
}

async function checkTokenBilling({ userId, execute, sqlValue, getCreditBalance, addCredits, billTokenTask }) {
  execute(`
    INSERT INTO model_pricing (
      id, provider, model, task, billing_type, input_price_per_million_tokens,
      output_price_per_million_tokens, min_credits_per_request, markup_multiplier,
      fallback_fixed_credits, enabled, created_at, updated_at
    )
    VALUES (
      ${sqlValue(randomUUID())}, 'qwen', 'token-large', 'vision_analysis', 'token',
      100, 100, 1, 2, 3, 1, ${Date.now()}, ${Date.now()}
    );
  `);
  addCredits(userId, { amount: 1000, reason: "test_topup" });
  const before = getCreditBalance(userId);
  const result = await billTokenTask({
    userId,
    provider: "qwen",
    model: "token-large",
    task: "vision_analysis",
    estimate: { inputText: "large estimate", imageCount: 1, maxOutputTokens: 100000 },
    callProvider: async () => ({
      text: "ok",
      usage: { inputTokens: 1000, outputTokens: 1000, totalTokens: 2000 }
    })
  });
  assert(result.billing.creditsReserved > result.billing.creditsCharged, "Token success should release unused reservation");
  assert(getCreditBalance(userId).reservedCredits === 0, "Token success should clear reservation");
  assert(getCreditBalance(userId).balanceCredits === before.balanceCredits - result.billing.creditsCharged, "Token success should charge actual usage");

  const missingUsage = await billTokenTask({
    userId,
    provider: "qwen",
    model: "token-large",
    task: "vision_analysis",
    estimate: { inputText: "missing usage", imageCount: 1, maxOutputTokens: 1 },
    callProvider: async () => ({ text: "ok" })
  });
  assert(missingUsage.billing.creditsCharged === 3, "Missing usage should use fallback fixed credits");
  assert(missingUsage.billing.reason === "usage_missing", "Missing usage should be marked");

  const balanceBeforeFailure = getCreditBalance(userId).balanceCredits;
  try {
    await billTokenTask({
      userId,
      provider: "qwen",
      model: "token-large",
      task: "vision_analysis",
      estimate: { inputText: "failure", imageCount: 1 },
      callProvider: async () => {
        throw new Error("fake token failure");
      }
    });
    throw new Error("Expected token provider failure");
  } catch (error) {
    assert(error.message === "fake token failure", "Token provider error should pass through");
  }
  assert(getCreditBalance(userId).balanceCredits === balanceBeforeFailure, "Token failure must not deduct credits");
  assert(getCreditBalance(userId).reservedCredits === 0, "Token failure should release reservation");
}

async function checkMissingAndInsufficientPricing({ userId, execute, getCreditBalance, billFixedTask }) {
  execute(`UPDATE credit_accounts SET balance_credits = 1, reserved_credits = 0 WHERE user_id = '${userId}';`);
  let calls = 0;
  try {
    await billFixedTask({
      userId,
      provider: "volcengine",
      model: "doubao-seedream-4-5-251128",
      task: "image_generation",
      callProvider: async () => {
        calls += 1;
        return {};
      }
    });
    throw new Error("Expected insufficient credits");
  } catch (error) {
    assert(error.message === "积分不足", "Insufficient credits should block the request");
  }
  assert(calls === 0, "Provider must not be called when credits are insufficient");

  try {
    await billFixedTask({
      userId,
      provider: "qwen",
      model: "qwen-image-plus",
      task: "not_configured",
      callProvider: async () => {
        calls += 1;
        return {};
      }
    });
    throw new Error("Expected missing pricing");
  } catch (error) {
    assert(error.message === "该模型未配置价格", "Missing pricing should block the request");
  }
  assert(calls === 0, "Provider must not be called when pricing is missing");
  assert(getCreditBalance(userId).reservedCredits === 0, "Blocked requests should not reserve credits");
}

async function checkAdminCommands({ dbPath, findUserByEmail, getCreditBalance }) {
  const beforeMissing = getCreditBalance(findUserByEmail("other-user@example.com").id);
  const missing = spawnSync(process.execPath, [
    "scripts/credits-add.js",
    "--email=missing@example.com",
    "--amount=100",
    "--reason=test"
  ], {
    cwd: process.cwd(),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: "utf8"
  });
  assert(missing.status !== 0, "Admin add should fail for missing user");
  assert(getCreditBalance(findUserByEmail("other-user@example.com").id).balanceCredits === beforeMissing.balanceCredits, "Missing user admin add must not modify data");

  const added = spawnSync(process.execPath, [
    "scripts/credits-add.js",
    "--email=credits-user@example.com",
    "--amount=7",
    "--reason=test-admin"
  ], {
    cwd: process.cwd(),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: "utf8"
  });
  assert(added.status === 0, `Admin add should succeed: ${added.stderr}`);

  const checked = spawnSync(process.execPath, [
    "scripts/credits-check.js",
    "--email=credits-user@example.com"
  ], {
    cwd: process.cwd(),
    env: { ...process.env, DB_PATH: dbPath },
    encoding: "utf8"
  });
  assert(checked.status === 0, `Admin check should succeed: ${checked.stderr}`);
  assert(checked.stdout.includes("test-admin"), "Admin check should show recent admin transaction");
}
