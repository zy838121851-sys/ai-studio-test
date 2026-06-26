import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-credit-quote-"));
process.env.DB_PATH = join(tempRoot, "quote.sqlite");
process.env.NODE_ENV = "test";
process.env.AUTH_CODE_PROVIDER = "mock";

let closeDatabaseRef = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { createServer } = await import("../src/server/index.js");
  const { execute, closeDatabase, initializeDatabase } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;
  const { runCreditsMigration } = await import("../src/server/db/credits-migration.js");
  const { createUser } = await import("../src/server/auth/user.service.js");
  const { createSession, SESSION_COOKIE_NAME } = await import("../src/server/auth/session.js");
  const { addCredits, getCreditBalance } = await import("../src/server/services/credits/credit.service.js");
  const { billFixedTask } = await import("../src/server/services/credits/billing.service.js");
  const { quoteFixedCredits } = await import("../src/server/services/credits/pricing.service.js");

  initializeDatabase();
  runCreditsMigration();

  const user = createUser({ email: "quote-user@example.com", password: "password123", name: "Quote User" });
  addCredits(user.id, { amount: 1000, reason: "quote_test_topup" });

  assertQuote(quoteFixedCredits({ provider: "apimart", model: "gpt-image-2", task: "image_generation", count: 1 }), 8, 8, 1);
  assertQuote(quoteFixedCredits({ provider: "apimart", model: "gpt-image-2", task: "image_generation", count: 4 }), 8, 32, 4);
  assertQuote(quoteFixedCredits({ provider: "apimart", model: "midjourney", task: "image_generation", count: 4 }), 8, 8, 1);
  assertQuote(quoteFixedCredits({ provider: "apimart", model: "qwen-image-2.0-pro", task: "image_generation", count: 1 }), 30, 30, 1);
  assertQuote(quoteFixedCredits({ provider: "apimart", model: "wan2.7-image-pro", task: "image_generation", count: 1 }), 30, 30, 1);
  assertQuote(quoteFixedCredits({ provider: "qwen", model: "qwen-unknown", task: "image_editing", count: 1 }), 16, 16, 1);
  assertQuote(quoteFixedCredits({ provider: "qwen", model: "qwen-image-edit-plus", task: "image_editing", count: 1 }), 12, 12, 1);
  assertQuote(quoteFixedCredits({ provider: "qwen", model: "qwen-image-edit-max", task: "image_editing", count: 1 }), 30, 30, 1);
  assertQuote(quoteFixedCredits({ provider: "volcengine", model: "volcengine-unknown", task: "image_generation", count: 1 }), 16, 16, 1);
  assertQuote(quoteFixedCredits({ provider: "volcengine", model: "doubao-seedream-5-0-lite-260128", task: "image_generation", count: 1 }), 12, 12, 1);
  assertQuote(quoteFixedCredits({ provider: "volcengine", model: "doubao-seedream-4-5-251128", task: "image_generation", count: 1 }), 16, 16, 1);
  assertQuote(quoteFixedCredits({ provider: "qwen", model: "qwen-vision", task: "vision_analysis", count: 1 }), 4, 4, 1);
  assertQuote(quoteFixedCredits({ provider: "qwen", model: "qwen-text", task: "prompt_optimize", count: 1 }), 2, 2, 1);
  assertQuote(quoteFixedCredits({ provider: "volcengine", model: "doubao-chat", task: "chat", count: 1 }), 2, 2, 1);

  for (const invalidCount of [0, -1, 999, "abc"]) {
    assertThrows(
      () => quoteFixedCredits({ provider: "apimart", model: "gpt-image-2", task: "image_generation", count: invalidCount }),
      "count must be an integer between 1 and 10",
      `Invalid count ${invalidCount} should fail`
    );
  }

  const beforeCount = getCreditBalance(user.id);
  let calls = 0;
  const counted = await billFixedTask({
    userId: user.id,
    provider: "apimart",
    model: "gpt-image-2",
    task: "image_generation",
    count: 4,
    callProvider: async () => {
      calls += 1;
      return { imageUrl: "mock://image" };
    }
  });
  assert(calls === 1, "Counted fixed billing should call fake provider once");
  assert(counted.billing.creditsCharged === 32, "image_generation count=4 should charge 32 credits");
  assert(counted.billing.count === 4, "Billing metadata should keep count=4");
  assert(getCreditBalance(user.id).balanceCredits === beforeCount.balanceCredits - 32, "Counted billing should deduct 32 credits");

  const beforeEdit = getCreditBalance(user.id);
  const edited = await billFixedTask({
    userId: user.id,
    provider: "qwen",
    model: "qwen-image-edit-plus",
    task: "image_editing",
    count: 4,
    callProvider: async () => ({ imageUrl: "mock://edit" })
  });
  assert(edited.billing.creditsCharged === 12, "image_editing should force count=1");
  assert(edited.billing.count === 1, "image_editing billing count should be 1");
  assert(getCreditBalance(user.id).balanceCredits === beforeEdit.balanceCredits - 12, "image_editing should deduct one edit");

  const beforeFailure = getCreditBalance(user.id);
  try {
    await billFixedTask({
      userId: user.id,
      provider: "apimart",
      model: "gpt-image-2",
      task: "image_generation",
      count: 2,
      callProvider: async () => {
        throw new Error("fake provider failure");
      }
    });
    throw new Error("Expected fake provider failure");
  } catch (error) {
    assert(error.message === "fake provider failure", "Provider failure should pass through");
  }
  assert(getCreditBalance(user.id).balanceCredits === beforeFailure.balanceCredits, "Provider failure must not deduct credits");
  assert(getCreditBalance(user.id).reservedCredits === 0, "Provider failure should release reserved credits");

  execute(`UPDATE credit_accounts SET balance_credits = 1, reserved_credits = 0 WHERE user_id = '${user.id}';`);
  let insufficientCalls = 0;
  try {
    await billFixedTask({
      userId: user.id,
      provider: "apimart",
      model: "gpt-image-2",
      task: "image_generation",
      count: 1,
      callProvider: async () => {
        insufficientCalls += 1;
        return { imageUrl: "mock://should-not-run" };
      }
    });
    throw new Error("Expected insufficient credits");
  } catch (error) {
    assert(error.message === "积分不足", "Insufficient credits should block billing");
  }
  assert(insufficientCalls === 0, "Provider must not be called when credits are insufficient");

  await checkQuoteRoute({ createServer, createSession, cookieName: SESSION_COOKIE_NAME, user });

  closeDatabase();
  console.log("Credit quote checks passed.");
} finally {
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function assertQuote(quote, unitCredits, totalCredits, count) {
  assert(quote.billingType === "fixed", "Quote billing type should be fixed");
  assert(quote.exact === true, "Quote should be exact");
  assert(quote.unitCredits === unitCredits, `Expected unit credits ${unitCredits}`);
  assert(quote.totalCredits === totalCredits, `Expected total credits ${totalCredits}`);
  assert(quote.count === count, `Expected count ${count}`);
  assert(quote.label === `消耗 ${totalCredits} 积分`, "Quote label should match total credits");
}

function assertThrows(fn, message, assertionMessage) {
  try {
    fn();
  } catch (error) {
    assert(error.message === message, assertionMessage);
    return;
  }
  throw new Error(assertionMessage);
}

async function checkQuoteRoute({ createServer, createSession, cookieName, user }) {
  const app = createServer();
  const server = await new Promise((resolve) => {
    const next = app.listen(0, "127.0.0.1", () => resolve(next));
  });
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const cookie = `${cookieName}=${encodeURIComponent(createSession(user.id))}`;
    const ok = await fetch(`${baseUrl}/api/credits/quote?model=gpt-image-2&task=image_generation&count=4`, {
      headers: { cookie }
    });
    assert(ok.status === 200, "Quote route should return 200 for configured model");
    const payload = await ok.json();
    assertQuote(payload.quote, 8, 32, 4);

    const unknown = await fetch(`${baseUrl}/api/credits/quote?model=mystery-model&task=image_generation&count=1`, {
      headers: { cookie }
    });
    assert(unknown.status === 402, "Unknown model without provider fallback should fail");
    const unknownPayload = await unknown.json();
    assert(unknownPayload.message === "该模型未配置价格", "Unknown model error should be explicit");

    const invalid = await fetch(`${baseUrl}/api/credits/quote?model=gpt-image-2&task=image_generation&count=999`, {
      headers: { cookie }
    });
    assert(invalid.status === 400, "Invalid count should fail");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
