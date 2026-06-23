import { env } from "./env.js";
import { assertSqliteAvailable, databasePath } from "../db/sqlite.js";

export function validateRuntimeEnvironment() {
  const allowsEphemeralPort = env.nodeEnv === "test" && env.port === 0;
  if (!Number.isInteger(env.port) || (!allowsEphemeralPort && env.port <= 0) || env.port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT || ""}`);
  }
  if (!Number.isFinite(env.maxUploadBytes) || env.maxUploadBytes <= 0) {
    throw new Error("MAX_UPLOAD_BYTES must be a positive number");
  }
  if (!Number.isFinite(env.maxProxyImageBytes) || env.maxProxyImageBytes <= 0) {
    throw new Error("MAX_PROXY_IMAGE_BYTES must be a positive number");
  }
  const sqliteVersion = assertSqliteAvailable();
  return {
    port: env.port,
    databasePath,
    sqliteVersion
  };
}
