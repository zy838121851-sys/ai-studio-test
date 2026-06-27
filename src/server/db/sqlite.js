import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

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
  const counts = queryReadOnly(`
    SELECT 'users' AS name, count(*) AS count FROM users
    UNION ALL SELECT 'sessions', count(*) FROM sessions
    UNION ALL SELECT 'user_identities', count(*) FROM user_identities
    UNION ALL SELECT 'verification_codes', count(*) FROM verification_codes
    UNION ALL SELECT 'oauth_states', count(*) FROM oauth_states
    UNION ALL SELECT 'projects', count(*) FROM projects
    UNION ALL SELECT 'chat_conversations', count(*) FROM chat_conversations
    UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages
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

    CREATE TABLE IF NOT EXISTS user_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      identifier TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      verified_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider, identifier),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_identities_user_id
      ON user_identities(user_id);

    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL,
      target TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_sent_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_verification_codes_target
      ON verification_codes(channel, target, purpose, consumed_at, expires_at);

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      redirect_to TEXT NOT NULL DEFAULT '/',
      expires_at INTEGER NOT NULL,
      user_id TEXT,
      completed_at INTEGER,
      session_issued_at INTEGER,
      consumed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_states_provider
      ON oauth_states(provider, expires_at);

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

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      UNIQUE(user_id, project_id, deleted_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_project
      ON chat_conversations(user_id, project_id, deleted_at, updated_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversations_active_project
      ON chat_conversations(user_id, project_id)
      WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'done',
      content_json TEXT NOT NULL DEFAULT '{}',
      attachments_json TEXT NOT NULL DEFAULT '[]',
      tool_calls_json TEXT NOT NULL DEFAULT '[]',
      thinking_steps_json TEXT NOT NULL DEFAULT '[]',
      decision_summary TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
      ON chat_messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_project
      ON chat_messages(user_id, project_id, created_at);

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
      library_visible INTEGER NOT NULL DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      vendor TEXT NOT NULL DEFAULT '',
      model_id TEXT NOT NULL DEFAULT '',
      provider_model TEXT NOT NULL DEFAULT '',
      remote_task_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'image',
      status TEXT NOT NULL DEFAULT 'queued',
      progress INTEGER NOT NULL DEFAULT 0,
      prompt_preview TEXT NOT NULL DEFAULT '',
      input_asset_ids_json TEXT NOT NULL DEFAULT '[]',
      output_asset_ids_json TEXT NOT NULL DEFAULT '[]',
      error_code TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      credits_reserved INTEGER NOT NULL DEFAULT 0,
      credits_charged INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_created
      ON ai_jobs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_remote_task
      ON ai_jobs(provider, remote_task_id);
  `);

  if (!tableHasColumn("assets", "collection_id")) {
    execute("ALTER TABLE assets ADD COLUMN collection_id TEXT;");
  }
  if (!tableHasColumn("assets", "library_visible")) {
    execute("ALTER TABLE assets ADD COLUMN library_visible INTEGER NOT NULL DEFAULT 1;");
    execute(`
      UPDATE assets
      SET library_visible = 0
      WHERE source = 'generated'
        AND COALESCE(collection_id, '') = ''
        AND COALESCE(collection, '') = '';
    `);
  }
  if (!tableHasColumn("users", "phone")) {
    execute("ALTER TABLE users ADD COLUMN phone TEXT;");
  }
  if (!tableHasColumn("oauth_states", "user_id")) {
    execute("ALTER TABLE oauth_states ADD COLUMN user_id TEXT;");
  }
  if (!tableHasColumn("oauth_states", "completed_at")) {
    execute("ALTER TABLE oauth_states ADD COLUMN completed_at INTEGER;");
  }
  if (!tableHasColumn("oauth_states", "session_issued_at")) {
    execute("ALTER TABLE oauth_states ADD COLUMN session_issued_at INTEGER;");
  }
  execute("CREATE INDEX IF NOT EXISTS idx_assets_user_collection_id ON assets(user_id, collection_id, deleted_at);");
  execute("CREATE INDEX IF NOT EXISTS idx_assets_user_library_visible ON assets(user_id, library_visible, deleted_at, updated_at);");

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
