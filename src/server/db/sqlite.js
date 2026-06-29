import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { resetDatabaseToV2, runSchemaMigrations } from "./migrations.js";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ai-studio.sqlite");

export const databasePath = process.env.DATABASE_URL?.startsWith("sqlite:")
  ? process.env.DATABASE_URL.slice("sqlite:".length)
  : (process.env.DB_PATH || process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH);

let connection = null;

function ensureDatabaseDirectory() {
  const dir = dirname(databasePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function getConnection() {
  ensureDatabaseDirectory();
  if (!connection) {
    connection = new Database(databasePath);
    connection.pragma("foreign_keys = ON");
  }
  return connection;
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

export function assertSqliteAvailable() {
  getConnection();
  return "better-sqlite3";
}

export function closeDatabase() {
  if (!connection) return;
  connection.close();
  connection = null;
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
  getConnection().exec(sql.trim());
}

export function query(sql) {
  return getConnection().prepare(sql.trim()).all();
}

export function queryOne(sql) {
  return query(sql)[0] || null;
}

export function queryReadOnly(sql) {
  return query(sql);
}

export function prepare(sql) {
  return getConnection().prepare(sql.trim());
}

export function transaction(fn) {
  const db = getConnection();
  return db.transaction(() => fn(db))();
}

export function getDatabaseHealth() {
  assertSqliteAvailable();
  const integrity = queryReadOnly("PRAGMA integrity_check;")[0]?.integrity_check || "unknown";
  const foreignKeyRows = queryReadOnly("PRAGMA foreign_key_check;");
  const tables = [
    "users",
    "sessions",
    "user_identities",
    "verification_codes",
    "oauth_states",
    "workspaces",
    "workspace_memberships",
    "billing_accounts",
    "projects",
    "project_snapshots",
    "chat_conversations",
    "chat_messages",
    "asset_collections",
    "asset_files",
    "assets",
    "project_assets",
    "ai_jobs",
    "ai_job_assets",
    "credit_transactions",
    "model_pricing"
  ];
  const counts = tables
    .filter((table) => tableExists(table))
    .map((table) => queryReadOnly(`SELECT ${sqlValue(table)} AS name, count(*) AS count FROM ${table};`)[0]);
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
  runSchemaMigrations(getConnection(), {
    databasePath,
    allowLegacyReset: envFlag("AI_STUDIO_DB_RESET_ON_BOOT", false)
  });
  seedEmailIdentities();
}

export function resetDatabase({ backup = true } = {}) {
  return resetDatabaseToV2(getConnection(), { databasePath, backup });
}

function tableExists(tableName) {
  return Boolean(queryOne(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ${sqlValue(tableName)}
    LIMIT 1;
  `));
}

function seedEmailIdentities() {
  if (!tableExists("user_identities") || !tableExists("users")) return;
  execute(`
    INSERT OR IGNORE INTO user_identities (
      id,
      user_id,
      provider,
      identifier,
      display_name,
      avatar_url,
      verified_at,
      created_at,
      updated_at
    )
    SELECT
      'email-password-' || id,
      id,
      'email',
      lower(email),
      name,
      '',
      created_at,
      created_at,
      updated_at
    FROM users
    WHERE email IS NOT NULL
      AND email != '';
  `);
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
