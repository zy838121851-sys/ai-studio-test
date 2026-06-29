import "dotenv/config";
import { isAbsolute, resolve } from "node:path";

const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME);

if (!isProduction && !isRailway) {
  console.log("railway_env_check=skipped");
  process.exit(0);
}

const failures = [];
const warnings = [];

if (isProduction) {
  checkProductionBaseUrl();
  if (envFlag("APIMART_MOCK", false)) failures.push("APIMART_MOCK must be false in production.");
  if (String(process.env.AUTH_CODE_PROVIDER || "").trim().toLowerCase() === "mock") {
    failures.push("AUTH_CODE_PROVIDER=mock is not allowed in production.");
  }
  if (envFlag("ENABLE_APIMART", true) && !String(process.env.APIMART_API_KEY || "").trim()) {
    failures.push("APIMART_API_KEY is required when ENABLE_APIMART is enabled in production.");
  }
}

if (isRailway) {
  const dbPath = getSqlitePath();
  const uploadDir = String(process.env.UPLOAD_DIR || "").trim();
  if (!dbPath) failures.push("Railway SQLite deploys must set DB_PATH or sqlite:DATABASE_URL.");
  if (!uploadDir) failures.push("Railway deploys must set UPLOAD_DIR.");
  if (dbPath) checkRailwayVolumePath("DB_PATH", dbPath);
  if (uploadDir) checkRailwayVolumePath("UPLOAD_DIR", uploadDir);
}

if (failures.length) {
  console.error("railway_env_check=failed");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("railway_env_check=ok");
warnings.forEach((warning) => console.warn(`warning: ${warning}`));

function checkProductionBaseUrl() {
  const raw = String(process.env.APP_BASE_URL || "").trim();
  if (!raw) {
    failures.push("APP_BASE_URL is required in production.");
    return;
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    failures.push("APP_BASE_URL must be a valid URL.");
    return;
  }
  if (url.protocol !== "https:") failures.push("APP_BASE_URL must use https:// in production.");
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)) {
    failures.push("APP_BASE_URL must not point to localhost in production.");
  }
}

function getSqlitePath() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (databaseUrl) {
    if (!databaseUrl.startsWith("sqlite:")) {
      failures.push("This Railway phase expects SQLite; DATABASE_URL must use sqlite: when set.");
      return "";
    }
    return databaseUrl.slice("sqlite:".length);
  }
  return String(process.env.DB_PATH || process.env.SQLITE_DB_PATH || "").trim();
}

function checkRailwayVolumePath(name, value) {
  const normalized = resolve(value);
  if (!isAbsolute(value)) failures.push(`${name} must be an absolute mounted Volume path on Railway.`);
  if (/[\\/]tmp[\\/]/i.test(normalized)) failures.push(`${name} must not point under a temporary directory.`);
  if (!/^[\\/]data(?:[\\/]|$)/i.test(normalized)) {
    warnings.push(`${name} is not under /data; confirm it points to the Railway Volume mount.`);
  }
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}
