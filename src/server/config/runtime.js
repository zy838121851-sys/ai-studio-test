import { env } from "./env.js";
import { assertSqliteAvailable, databasePath } from "../db/sqlite.js";
import { assertProviderReadiness } from "./provider-readiness.js";

export function validateRuntimeEnvironment() {
  const allowsEphemeralPort = env.nodeEnv === "test" && env.port === 0;
  if (!Number.isInteger(env.port) || (!allowsEphemeralPort && env.port <= 0) || env.port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT || ""}`);
  }
  if (!Number.isFinite(env.maxUploadBytes) || env.maxUploadBytes <= 0) {
    throw new Error("MAX_UPLOAD_BYTES must be a positive number");
  }
  if (!Number.isFinite(env.maxModelUploadBytes) || env.maxModelUploadBytes <= 0) {
    throw new Error("MAX_MODEL_UPLOAD_BYTES must be a positive number");
  }
  if (!Number.isFinite(env.maxProxyImageBytes) || env.maxProxyImageBytes <= 0) {
    throw new Error("MAX_PROXY_IMAGE_BYTES must be a positive number");
  }
  validateProductionEnvironment();
  const sqliteVersion = assertSqliteAvailable();
  return {
    port: env.port,
    databasePath,
    sqliteVersion
  };
}

function validateProductionEnvironment() {
  const isProduction = env.nodeEnv === "production";
  const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME);
  if (!isProduction && !isRailway) return;

  assertProviderReadiness({
    profile: process.env.SAAS_RUNTIME_PROFILE || "single-instance"
  });

  if (isProduction) {
    validateProductionBaseUrl();
    if (env.apimartMock) {
      throw new Error("APIMART_MOCK must be disabled in production.");
    }
    if (String(env.authCodeProvider || "").trim().toLowerCase() === "mock") {
      throw new Error("AUTH_CODE_PROVIDER=mock is not allowed in production.");
    }
  }

  if (isRailway) {
    if (!process.env.DB_PATH && !process.env.DATABASE_URL) {
      throw new Error("Railway SQLite deploys must set DB_PATH or DATABASE_URL to a mounted Volume path.");
    }
    if (!process.env.UPLOAD_DIR) {
      throw new Error("Railway deploys must set UPLOAD_DIR to a mounted Volume path.");
    }
  }

  const database = String(databasePath || "");
  const uploadDir = String(env.uploadDir || "");
  if (isProduction && /(?:^|[\\/])tmp(?:[\\/]|$)/i.test(database)) {
    throw new Error("Production database path must not be under a temporary directory.");
  }
  if (isProduction && /(?:^|[\\/])tmp(?:[\\/]|$)/i.test(uploadDir)) {
    throw new Error("Production upload path must not be under a temporary directory.");
  }
}

function validateProductionBaseUrl() {
  const raw = String(process.env.APP_BASE_URL || "").trim();
  if (!raw) {
    throw new Error("APP_BASE_URL is required in production.");
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("APP_BASE_URL must be a valid URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use https:// in production.");
  }
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)) {
    throw new Error("APP_BASE_URL must not point to localhost in production.");
  }
}
