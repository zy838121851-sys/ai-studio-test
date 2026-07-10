import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-security-headers-"));
process.env.DB_PATH = join(tempRoot, "security-headers.sqlite");
process.env.UPLOAD_DIR = join(tempRoot, "uploads");
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.PORT = "0";
process.env.AUTH_CODE_PROVIDER = process.env.AUTH_CODE_PROVIDER || "mock";

const strict = process.env.NODE_ENV === "production"
  || ["1", "true", "yes", "on"].includes(String(process.env.SECURITY_HEADERS_STRICT || "").trim().toLowerCase());

let server = null;
let closeDatabaseRef = null;
let strictFailureMessage = "";

try {
  const { createServer } = await import("../src/server/index.js");
  const { closeDatabase } = await import("../src/server/db/sqlite.js");
  closeDatabaseRef = closeDatabase;

  const app = createServer();
  server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${baseUrl}/health`);

  assert(response.status === 200, "Health endpoint should be reachable for security header checks");
  assertHeader(response, "x-content-type-options", "nosniff");
  assertHeader(response, "referrer-policy", "strict-origin-when-cross-origin");
  assertHeader(response, "x-frame-options", "DENY");
  if (process.env.NODE_ENV === "production") {
    assertHeader(response, "strict-transport-security", "max-age=31536000");
  } else {
    assert(!response.headers.get("strict-transport-security"), "Non-production responses should not set HSTS");
  }

  const csp = response.headers.get("content-security-policy") || "";
  assert(csp, "Content-Security-Policy header should be present");
  assertCspDirective(csp, "default-src", "'self'");
  assertCspDirective(csp, "base-uri", "'self'");
  assertCspDirective(csp, "form-action", "'self'");
  assertCspDirective(csp, "object-src", "'none'");
  assertCspDirective(csp, "frame-ancestors", "'none'");

  const risks = [
    csp.includes("'unsafe-inline'") ? "CSP allows unsafe-inline" : "",
    csp.includes("'unsafe-eval'") ? "CSP allows unsafe-eval" : "",
    directiveIncludes(csp, "img-src", "http:") ? "CSP img-src allows http:" : "",
    directiveIncludes(csp, "media-src", "http:") ? "CSP media-src allows http:" : "",
    directiveIncludes(csp, "connect-src", "http:") ? "CSP connect-src allows http:" : ""
  ].filter(Boolean);

  if (risks.length > 0) {
    console.warn(`security header known risks: ${risks.join("; ")}`);
  }
  if (strict && risks.length > 0) {
    strictFailureMessage = `Strict security header check failed: ${risks.join("; ")}`;
  }

  if (!strictFailureMessage) {
    console.log("Security header checks passed.");
  }
} finally {
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

if (strictFailureMessage) {
  console.error(strictFailureMessage);
  process.exitCode = 1;
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });
}

function assertHeader(response, name, expected) {
  const actual = response.headers.get(name) || "";
  assert(actual === expected, `${name} should be ${expected}, got ${actual || "(missing)"}`);
}

function assertCspDirective(csp, directive, expectedValue) {
  const values = getCspDirectiveValues(csp, directive);
  assert(values.includes(expectedValue), `CSP ${directive} should include ${expectedValue}`);
}

function directiveIncludes(csp, directive, value) {
  return getCspDirectiveValues(csp, directive).includes(value);
}

function getCspDirectiveValues(csp, directive) {
  const entry = String(csp || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directive} `));
  if (!entry) return [];
  return entry.split(/\s+/).slice(1);
}
