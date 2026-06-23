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

function runReadOnlySqliteScript(script) {
  const result = spawnSync("sqlite3", ["-readonly", "-batch", databasePath], {
    input: script,
    encoding: "utf8"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || "sqlite3 read-only command failed").trim());
  }
  return result.stdout || "";
}

export function assertSqliteAvailable() {
  const result = spawnSync("sqlite3", ["-version"], { encoding: "utf8" });
  if (result.error) {
    throw new Error("sqlite3 command is required but was not found in PATH");
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || "sqlite3 command is not usable").trim());
  }
  return (result.stdout || "").trim();
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

export function queryReadOnly(sql) {
  const output = runReadOnlySqliteScript(`.mode json\n${sql.trim()}\n`);
  const clean = output.trim();
  return clean ? JSON.parse(clean) : [];
}

export function getDatabaseHealth() {
  assertSqliteAvailable();
  const integrity = runReadOnlySqliteScript("PRAGMA integrity_check;\n").trim();
  const foreignKeyRows = queryReadOnly("PRAGMA foreign_key_check;");
  const counts = queryReadOnly(`
    SELECT 'users' AS name, count(*) AS count FROM users
    UNION ALL SELECT 'sessions', count(*) FROM sessions
    UNION ALL SELECT 'projects', count(*) FROM projects
    UNION ALL SELECT 'asset_collections', count(*) FROM asset_collections
    UNION ALL SELECT 'assets', count(*) FROM assets;
  `);
  return {
    ok: integrity === "ok" && foreignKeyRows.length === 0,
    integrity,
    foreignKeyIssues: foreignKeyRows.length,
    counts: Object.fromEntries(counts.map((row) => [row.name, Number(row.count || 0)]))
  };
}

function tableHasColumn(tableName, columnName) {
  return query(`PRAGMA table_info(${tableName});`).some((column) => column.name === columnName);
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

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      thumbnail TEXT NOT NULL DEFAULT '',
      item_count INTEGER NOT NULL DEFAULT 0,
      canvas_snapshot_json TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_opened_at INTEGER,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projects_user_active
      ON projects(user_id, deleted_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_projects_user_last_opened
      ON projects(user_id, deleted_at, last_opened_at);

    CREATE TABLE IF NOT EXISTS asset_collections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_asset_collections_user_active
      ON asset_collections(user_id, deleted_at, updated_at);

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      collection_id TEXT,
      type TEXT NOT NULL DEFAULT 'other',
      source TEXT NOT NULL DEFAULT 'upload',
      title TEXT NOT NULL DEFAULT '',
      collection TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      duration REAL,
      prompt TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (collection_id) REFERENCES asset_collections(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assets_user_active
      ON assets(user_id, deleted_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_assets_user_project
      ON assets(user_id, project_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_assets_user_collection
      ON assets(user_id, collection, deleted_at);
  `);

  if (!tableHasColumn("assets", "collection_id")) {
    execute("ALTER TABLE assets ADD COLUMN collection_id TEXT;");
  }
  execute("CREATE INDEX IF NOT EXISTS idx_assets_user_collection_id ON assets(user_id, collection_id, deleted_at);");
}

export function cleanupExpiredOrphanSessions(now = Date.now()) {
  const before = queryOne(`
    SELECT count(*) AS count
    FROM sessions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE u.id IS NULL
      AND s.expires_at <= ${now};
  `)?.count || 0;

  execute(`
    DELETE FROM sessions
    WHERE expires_at <= ${now}
      AND NOT EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = sessions.user_id
      );
  `);

  return Number(before || 0);
}
