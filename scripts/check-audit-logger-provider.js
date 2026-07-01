import { createLocalAuditLogger } from "../src/server/providers/audit/local-audit-logger.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function captureConsole(callback) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const entries = [];

  console.log = (...args) => {
    entries.push({ level: "log", args });
  };
  console.warn = (...args) => {
    entries.push({ level: "warn", args });
  };

  try {
    callback();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  return entries;
}

const logger = createLocalAuditLogger();
const originalNow = Date.now;
Date.now = () => 1700000000000;

try {
  const metadata = logger.requestMetadata({
    ip: "",
    socket: { remoteAddress: "10.0.0.7" },
    get(name) {
      return name === "user-agent" ? "AuditCheck/1.0" : "";
    }
  });

  assert(metadata.ip === "10.0.0.7", "Request metadata should fall back to socket remote address");
  assert(metadata.userAgent === "AuditCheck/1.0", "Request metadata should include user-agent");

  const infoEntries = captureConsole(() => {
    logger.record("auth.login.succeeded", {
      outcome: "succeeded",
      userId: "user_1",
      token: "secret-token",
      authorization: "Bearer secret",
      body: "raw request body",
      imageUrl: "https://example.test/private.png",
      safeLongValue: "x".repeat(310)
    });
  });

  assert(infoEntries.length === 1, "Succeeded audit events should write one log entry");
  assert(infoEntries[0].level === "log", "Succeeded audit events should use info logging");
  assert(infoEntries[0].args[0] === "[info] audit:auth.login.succeeded", "Info log should include audit event name");

  const infoPayload = infoEntries[0].args[1];
  assert(infoPayload.outcome === "succeeded", "Info payload should keep outcome");
  assert(infoPayload.userId === "user_1", "Info payload should keep safe user id");
  assert(infoPayload.at === 1700000000000, "Audit logger should add an at timestamp");
  assert(!("token" in infoPayload), "Audit logger should not emit token fields");
  assert(!("authorization" in infoPayload), "Audit logger should not emit authorization fields");
  assert(!("body" in infoPayload), "Audit logger should not emit body fields");
  assert(!("imageUrl" in infoPayload), "Audit logger should not emit image fields");
  assert(infoPayload.safeLongValue.length === 303, "Logger should truncate long string fields");
  assert(infoPayload.safeLongValue.endsWith("..."), "Truncated string fields should be marked");

  const warnEntries = captureConsole(() => {
    logger.record("auth.login.failed", {
      outcome: "failed",
      status: 401,
      userId: "user_2"
    });
  });

  assert(warnEntries.length === 1, "Failed audit events should write one log entry");
  assert(warnEntries[0].level === "warn", "Failed audit events should use warn logging");
  assert(warnEntries[0].args[0] === "[warn] audit:auth.login.failed", "Warn log should include audit event name");

  const warnPayload = warnEntries[0].args[1];
  assert(warnPayload.outcome === "failed", "Warn payload should keep failed outcome");
  assert(warnPayload.status === 401, "Warn payload should keep failure status");
  assert(warnPayload.at === 1700000000000, "Warn payload should include an at timestamp");
} finally {
  Date.now = originalNow;
}

console.log("Audit logger provider checks passed.");
