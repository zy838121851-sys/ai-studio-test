import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export const CURRENT_SCHEMA_VERSION = 4;

const CORE_TABLES = [
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
  "asset_collections",
  "asset_files",
  "assets",
  "project_assets",
  "chat_conversations",
  "chat_messages",
  "ai_jobs",
  "ai_job_assets",
  "credit_transactions",
  "model_pricing"
];

export function backupDatabase(databasePath, { label = "before-v2-reset" } = {}) {
  if (!existsSync(databasePath)) return null;
  const backupDir = join(dirname(databasePath), "backups");
  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `ai-studio-${label}-${stamp}.sqlite`);
  copyFileSync(databasePath, backupPath);
  return backupPath;
}

export function runSchemaMigrations(db, {
  databasePath,
  allowLegacyReset = false
} = {}) {
  const hasMigrations = tableExists(db, "schema_migrations");
  const existingTables = listUserTables(db);
  const hasLegacyTables = !hasMigrations && existingTables.length > 0;

  if (hasLegacyTables) {
    if (!allowLegacyReset) {
      throw new Error("Legacy SQLite schema detected. Run `npm run db:reset:v2` or set AI_STUDIO_DB_RESET_ON_BOOT=true after backing up test data.");
    }
    backupDatabase(databasePath, { label: "auto-v2-reset" });
    dropAllUserTables(db);
  }

  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const current = Number(db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;").get()?.version || 0);
  if (current < 2) {
    applyV2Schema(db);
    insertMigration(db, 2, "v2_saas_foundation");
  } else {
    applyV2Schema(db);
  }
  if (current < 3) {
    applyV3Schema(db);
    insertMigration(db, 3, "v3_ai_job_failure_fields");
  } else {
    applyV3Schema(db);
  }
  if (current < 4) {
    applyV4Schema(db);
    insertMigration(db, 4, "v4_ai_job_log_details");
  } else {
    applyV4Schema(db);
  }
}

export function resetDatabaseToV2(db, { databasePath, backup = true } = {}) {
  const backupPath = backup ? backupDatabase(databasePath, { label: "manual-v2-reset" }) : null;
  dropAllUserTables(db);
  runSchemaMigrations(db, { databasePath, allowLegacyReset: true });
  return { backupPath };
}

function tableExists(db, name) {
  return Boolean(db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
    LIMIT 1;
  `).get(name));
}

function listUserTables(db) {
  return db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `).all().map((row) => row.name);
}

function dropAllUserTables(db) {
  const tables = listUserTables(db).filter((name) => name !== "sqlite_sequence");
  db.exec("PRAGMA foreign_keys = OFF;");
  for (const table of tables) {
    db.prepare(`DROP TABLE IF EXISTS "${table}";`).run();
  }
  db.exec("PRAGMA foreign_keys = ON;");
}

function applyV2Schema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      phone TEXT,
      name TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL DEFAULT '',
      password_salt TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
      ON users(lower(email))
      WHERE email IS NOT NULL AND email != '' AND deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
      ON users(phone)
      WHERE phone IS NOT NULL AND phone != '' AND deleted_at IS NULL;

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
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_states_provider
      ON oauth_states(provider, expires_at);

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'personal',
      name TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_owner_active
      ON workspaces(owner_user_id, deleted_at, updated_at);

    CREATE TABLE IF NOT EXISTS workspace_memberships (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      UNIQUE(workspace_id, user_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user_active
      ON workspace_memberships(user_id, deleted_at, updated_at);

    CREATE TABLE IF NOT EXISTS billing_accounts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL UNIQUE,
      owner_user_id TEXT NOT NULL,
      balance_credits INTEGER NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
      reserved_credits INTEGER NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_billing_accounts_owner
      ON billing_accounts(owner_user_id);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      item_count INTEGER NOT NULL DEFAULT 0,
      current_snapshot_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_opened_at INTEGER,
      deleted_at INTEGER,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (current_snapshot_id) REFERENCES project_snapshots(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_projects_workspace_active
      ON projects(workspace_id, deleted_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_projects_owner_last_opened
      ON projects(owner_user_id, deleted_at, last_opened_at);

    CREATE TABLE IF NOT EXISTS project_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      snapshot_json TEXT NOT NULL DEFAULT '',
      node_count INTEGER NOT NULL DEFAULT 0,
      created_by_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_created
      ON project_snapshots(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS asset_collections (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_asset_collections_workspace_active
      ON asset_collections(workspace_id, deleted_at, updated_at);

    CREATE TABLE IF NOT EXISTS asset_files (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'local',
      storage_key TEXT NOT NULL DEFAULT '',
      file_path TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      thumbnail_url TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      width INTEGER,
      height INTEGER,
      duration REAL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_asset_files_workspace_created
      ON asset_files(workspace_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      file_id TEXT,
      collection_id TEXT,
      type TEXT NOT NULL DEFAULT 'other',
      source TEXT NOT NULL DEFAULT 'upload',
      title TEXT NOT NULL DEFAULT '',
      collection TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      model_name TEXT NOT NULL DEFAULT '',
      library_visible INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES asset_files(id) ON DELETE SET NULL,
      FOREIGN KEY (collection_id) REFERENCES asset_collections(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_assets_workspace_active
      ON assets(workspace_id, deleted_at, updated_at);
    CREATE INDEX IF NOT EXISTS idx_assets_workspace_collection
      ON assets(workspace_id, collection_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_assets_workspace_library_visible
      ON assets(workspace_id, library_visible, deleted_at, updated_at);

    CREATE TABLE IF NOT EXISTS project_assets (
      project_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (project_id, asset_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_project_assets_asset
      ON project_assets(asset_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_conversations_project
      ON chat_conversations(workspace_id, project_id, deleted_at, updated_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conversations_active_project
      ON chat_conversations(workspace_id, project_id)
      WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
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
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
      ON chat_messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_workspace_project
      ON chat_messages(workspace_id, project_id, created_at);

    CREATE TABLE IF NOT EXISTS ai_jobs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
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
      error_code TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      failure_code TEXT NOT NULL DEFAULT '',
      failure_message TEXT NOT NULL DEFAULT '',
      request_json TEXT NOT NULL DEFAULT '{}',
      response_json TEXT NOT NULL DEFAULT '{}',
      duration_ms INTEGER,
      credits_reserved INTEGER NOT NULL DEFAULT 0,
      credits_charged INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_jobs_workspace_created
      ON ai_jobs(workspace_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_jobs_remote_task
      ON ai_jobs(provider, remote_task_id);

    CREATE TABLE IF NOT EXISTS ai_job_assets (
      job_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (job_id, asset_id, direction),
      FOREIGN KEY (job_id) REFERENCES ai_jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_job_assets_asset
      ON ai_job_assets(asset_id, direction);

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      billing_account_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_credits INTEGER NOT NULL DEFAULT 0,
      balance_after INTEGER NOT NULL DEFAULT 0,
      reserved_after INTEGER NOT NULL DEFAULT 0,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      task TEXT NOT NULL DEFAULT '',
      billing_type TEXT NOT NULL DEFAULT '',
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      credits_reserved INTEGER NOT NULL DEFAULT 0,
      credits_charged INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      idempotency_key TEXT NOT NULL DEFAULT '',
      ai_job_id TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (billing_account_id) REFERENCES billing_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (ai_job_id) REFERENCES ai_jobs(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_credit_transactions_account_created
      ON credit_transactions(billing_account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
      ON credit_transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_credit_transactions_request
      ON credit_transactions(request_id);

    CREATE TABLE IF NOT EXISTS model_pricing (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      task TEXT NOT NULL,
      billing_type TEXT NOT NULL,
      fixed_credits INTEGER,
      input_price_per_million_tokens REAL,
      output_price_per_million_tokens REAL,
      cached_input_price_per_million_tokens REAL,
      min_credits_per_request INTEGER NOT NULL DEFAULT 1,
      markup_multiplier REAL NOT NULL DEFAULT 2,
      fallback_fixed_credits INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(provider, model, task)
    );

    CREATE INDEX IF NOT EXISTS idx_model_pricing_lookup
      ON model_pricing(provider, model, task, enabled);
  `);

  ensureCoreIndexes(db);
}

function applyV3Schema(db) {
  addColumnIfMissing(db, "ai_jobs", "failure_code", "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "ai_jobs", "failure_message", "TEXT NOT NULL DEFAULT ''");
  db.exec(`
    UPDATE ai_jobs
    SET failure_code = CASE
          WHEN failure_code = '' THEN COALESCE(error_code, '')
          ELSE failure_code
        END,
        failure_message = CASE
          WHEN failure_message = '' THEN COALESCE(error_message, '')
          ELSE failure_message
        END;
  `);
}

function applyV4Schema(db) {
  addColumnIfMissing(db, "ai_jobs", "request_json", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(db, "ai_jobs", "response_json", "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(db, "ai_jobs", "duration_ms", "INTEGER");
  db.exec(`
    UPDATE ai_jobs
    SET request_json = '{}'
    WHERE request_json IS NULL
       OR request_json = ''
       OR json_valid(request_json) = 0;

    UPDATE ai_jobs
    SET response_json = '{}'
    WHERE response_json IS NULL
       OR response_json = ''
       OR json_valid(response_json) = 0;
  `);
}

function insertMigration(db, version, name) {
  db.prepare("INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);")
    .run(version, name, Date.now());
}

function addColumnIfMissing(db, table, column, definition) {
  if (!tableHasColumn(db, table, column)) {
    db.prepare(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition};`).run();
  }
}

function tableHasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info("${table}");`).all()
    .some((row) => row.name === column);
}

function ensureCoreIndexes(db) {
  for (const table of CORE_TABLES) {
    if (!tableExists(db, table)) {
      throw new Error(`V2 schema migration failed to create table: ${table}`);
    }
  }
}
