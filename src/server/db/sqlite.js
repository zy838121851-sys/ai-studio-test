import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ai-studio.sqlite");

export const databasePath = process.env.DATABASE_URL?.startsWith("sqlite:")
  ? process.env.DATABASE_URL.slice("sqlite:".length)
  : (process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH);

function ensureDatabaseDirectory() {
  const dir = dirname(databasePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function runSqliteScript(script) {
  ensureDatabaseDirectory();
  const result = spawnSync("sqlite3", ["-batch", databasePath], {
    input: script,
    encoding: "utf8"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || "sqlite3 command failed").trim());
  }
  return result.stdout || "";
}

export function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid SQL number");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function execute(sql) {
  runSqliteScript(`${sql.trim()}\n`);
}

export function query(sql) {
  const output = runSqliteScript(`.mode json\n${sql.trim()}\n`);
  const clean = output.trim();
  return clean ? JSON.parse(clean) : [];
}

export function queryOne(sql) {
  return query(sql)[0] || null;
}

export function initializeDatabase() {
  execute(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);
}
