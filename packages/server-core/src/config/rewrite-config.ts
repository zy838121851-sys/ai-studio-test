import path from "node:path";

export type RewriteNodeEnvironment = "development" | "test" | "production";

export interface LocalStorageConfig {
  provider: "local";
  rootDirectory: string;
}

export interface OssStorageConfig {
  provider: "oss";
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string | undefined;
}

export interface RewriteConfig {
  nodeEnvironment: RewriteNodeEnvironment;
  apiHost: string;
  apiPort: number;
  appBaseUrl: URL;
  databaseUrl: string;
  redisUrl: string;
  sessionSecret: string;
  storage: LocalStorageConfig | OssStorageConfig;
  imageProvider:
    | { provider: "development" }
    | { provider: "apimart"; apiKey: string; baseUrl: URL };
  workerConcurrency: number;
}

const LOCAL_DATABASE_URL =
  "postgres://ai_studio:ai_studio_local@127.0.0.1:55432/ai_studio_rewrite";
const LOCAL_REDIS_URL = "redis://127.0.0.1:56379";
const LOCAL_SESSION_SECRET = "ai-studio-rewrite-local-session-secret";

function readEnvironment(value: string | undefined): RewriteNodeEnvironment {
  if (value === "production" || value === "test" || value === "development") {
    return value;
  }

  return "development";
}

function readPort(value: string | undefined): number {
  const port = Number(value ?? 4100);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("REWRITE_API_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function parseUrl(value: string, name: string, protocols: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}.`);
  }

  return url;
}

export function loadRewriteConfig(environment: NodeJS.ProcessEnv): RewriteConfig {
  const nodeEnvironment = readEnvironment(environment.NODE_ENV);
  const isProduction = nodeEnvironment === "production";
  const databaseUrl = environment.DATABASE_URL?.trim() || LOCAL_DATABASE_URL;
  const redisUrl = environment.REDIS_URL?.trim() || LOCAL_REDIS_URL;
  const sessionSecret = environment.SESSION_SECRET?.trim() || LOCAL_SESSION_SECRET;
  const appBaseUrl = parseUrl(
    environment.REWRITE_APP_BASE_URL?.trim() || "http://localhost:4174",
    "REWRITE_APP_BASE_URL",
    isProduction ? ["https:"] : ["http:", "https:"]
  );

  parseUrl(databaseUrl, "DATABASE_URL", ["postgres:", "postgresql:"]);
  parseUrl(redisUrl, "REDIS_URL", ["redis:", "rediss:"]);

  if (isProduction && !environment.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required in production.");
  }
  if (isProduction && !environment.REDIS_URL?.trim()) {
    throw new Error("REDIS_URL is required in production.");
  }
  if (isProduction && (!environment.SESSION_SECRET?.trim() || sessionSecret.length < 32)) {
    throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
  }

  const storageProvider = environment.STORAGE_PROVIDER?.trim() || "local";
  if (storageProvider !== "local" && storageProvider !== "oss") {
    throw new Error("STORAGE_PROVIDER must be local or oss.");
  }
  if (isProduction && storageProvider !== "oss") {
    throw new Error("Production rewrite must use the OSS storage provider.");
  }

  const storage: LocalStorageConfig | OssStorageConfig =
    storageProvider === "local"
      ? {
          provider: "local",
          rootDirectory: path.resolve(
            environment.LOCAL_STORAGE_DIR?.trim() || ".rewrite-data/uploads"
          )
        }
      : {
          provider: "oss",
          region: requireValue(environment, "OSS_REGION"),
          bucket: requireValue(environment, "OSS_BUCKET"),
          accessKeyId: requireValue(environment, "OSS_ACCESS_KEY_ID"),
          accessKeySecret: requireValue(environment, "OSS_ACCESS_KEY_SECRET"),
          endpoint: environment.OSS_ENDPOINT?.trim() || undefined
        };

  const imageProviderName = environment.REWRITE_IMAGE_PROVIDER?.trim() || "development";
  if (imageProviderName !== "development" && imageProviderName !== "apimart") {
    throw new Error("REWRITE_IMAGE_PROVIDER must be development or apimart.");
  }
  if (isProduction && imageProviderName === "development") {
    throw new Error("Production rewrite must not use the development image provider.");
  }
  const imageProvider =
    imageProviderName === "development"
      ? ({ provider: "development" } as const)
      : ({
          provider: "apimart",
          apiKey: requireValue(environment, "APIMART_API_KEY"),
          baseUrl: parseUrl(
            environment.APIMART_BASE_URL?.trim() || "https://api.apimart.ai/v1",
            "APIMART_BASE_URL",
            ["https:"]
          )
        } as const);
  const workerConcurrency = Number(environment.REWRITE_WORKER_CONCURRENCY ?? 2);
  if (!Number.isInteger(workerConcurrency) || workerConcurrency < 1 || workerConcurrency > 20) {
    throw new Error("REWRITE_WORKER_CONCURRENCY must be an integer between 1 and 20.");
  }

  return {
    nodeEnvironment,
    apiHost: environment.REWRITE_API_HOST?.trim() || "127.0.0.1",
    apiPort: readPort(environment.REWRITE_API_PORT),
    appBaseUrl,
    databaseUrl,
    redisUrl,
    sessionSecret,
    storage,
    imageProvider,
    workerConcurrency
  };
}
