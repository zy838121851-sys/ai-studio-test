import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const tempRoot = mkdtempSync(join(tmpdir(), "ai-studio-production-env-gate-"));
const emptyDotenvPath = join(tempRoot, ".env.missing");

const baseEnv = {
  PATH: process.env.PATH || "",
  Path: process.env.Path || "",
  SystemRoot: process.env.SystemRoot || "",
  TEMP: process.env.TEMP || tempRoot,
  TMP: process.env.TMP || tempRoot,
  DOTENV_CONFIG_PATH: emptyDotenvPath
};

const safeProductionRailwayEnv = {
  NODE_ENV: "production",
  RAILWAY_ENVIRONMENT: "production",
  APP_BASE_URL: "https://ai-studio.example.test",
  DB_PATH: "/data/ai-studio.sqlite",
  UPLOAD_DIR: "/data/uploads",
  APIMART_MOCK: "false",
  AUTH_CODE_PROVIDER: "aliyun",
  APIMART_API_KEY: "production-env-gate-apimart-key"
};

const cases = [
  {
    name: "local non-production is skipped",
    env: { NODE_ENV: "test" },
    expectStatus: 0,
    expectOutput: "railway_env_check=skipped"
  },
  {
    name: "valid production railway env passes",
    env: safeProductionRailwayEnv,
    expectStatus: 0,
    expectOutput: "railway_env_check=ok"
  },
  {
    name: "production requires APP_BASE_URL",
    env: without(safeProductionRailwayEnv, "APP_BASE_URL"),
    expectStatus: 1,
    expectOutput: "APP_BASE_URL is required in production."
  },
  {
    name: "production rejects localhost APP_BASE_URL",
    env: { ...safeProductionRailwayEnv, APP_BASE_URL: "https://localhost" },
    expectStatus: 1,
    expectOutput: "APP_BASE_URL must not point to localhost in production."
  },
  {
    name: "production rejects http APP_BASE_URL",
    env: { ...safeProductionRailwayEnv, APP_BASE_URL: "http://ai-studio.example.test" },
    expectStatus: 1,
    expectOutput: "APP_BASE_URL must use https:// in production."
  },
  {
    name: "production rejects APIMART_MOCK",
    env: { ...safeProductionRailwayEnv, APIMART_MOCK: "true" },
    expectStatus: 1,
    expectOutput: "APIMART_MOCK must be false in production."
  },
  {
    name: "production rejects mock auth code provider",
    env: { ...safeProductionRailwayEnv, AUTH_CODE_PROVIDER: "mock" },
    expectStatus: 1,
    expectOutput: "AUTH_CODE_PROVIDER=mock is not allowed in production."
  },
  {
    name: "production requires APIMART_API_KEY when APIMART is enabled",
    env: without(safeProductionRailwayEnv, "APIMART_API_KEY"),
    expectStatus: 1,
    expectOutput: "APIMART_API_KEY is required when ENABLE_APIMART is enabled in production."
  },
  {
    name: "railway requires database path",
    env: without(safeProductionRailwayEnv, "DB_PATH"),
    expectStatus: 1,
    expectOutput: "Railway SQLite deploys must set DB_PATH or sqlite:DATABASE_URL."
  },
  {
    name: "railway requires upload path",
    env: without(safeProductionRailwayEnv, "UPLOAD_DIR"),
    expectStatus: 1,
    expectOutput: "Railway deploys must set UPLOAD_DIR."
  },
  {
    name: "railway rejects relative database path",
    env: { ...safeProductionRailwayEnv, DB_PATH: "data/ai-studio.sqlite" },
    expectStatus: 1,
    expectOutput: "DB_PATH must be an absolute mounted Volume path on Railway."
  },
  {
    name: "railway rejects tmp upload path",
    env: { ...safeProductionRailwayEnv, UPLOAD_DIR: "/tmp/uploads" },
    expectStatus: 1,
    expectOutput: "UPLOAD_DIR must not point under a temporary directory."
  },
  {
    name: "railway rejects non-sqlite DATABASE_URL",
    env: { ...without(safeProductionRailwayEnv, "DB_PATH"), DATABASE_URL: "postgres://example" },
    expectStatus: 1,
    expectOutput: "This Railway phase expects SQLite; DATABASE_URL must use sqlite: when set."
  }
];

try {
  for (const testCase of cases) {
    runCase(testCase);
  }
  console.log("Production env gate checks passed.");
} finally {
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function runCase({ name, env, expectStatus, expectOutput }) {
  const result = spawnSync(process.execPath, ["scripts/check-railway-env.js"], {
    cwd: process.cwd(),
    env: { ...baseEnv, ...env },
    encoding: "utf8"
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== expectStatus || !output.includes(expectOutput)) {
    throw new Error([
      `Production env gate case failed: ${name}`,
      `expected status=${expectStatus}, actual status=${result.status}`,
      `expected output to include: ${expectOutput}`,
      "actual output:",
      output.trim() || "(empty)"
    ].join("\n"));
  }
}

function without(source, key) {
  const copy = { ...source };
  delete copy[key];
  return copy;
}
