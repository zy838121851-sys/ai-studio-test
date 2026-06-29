import "dotenv/config";
import { existsSync } from "node:fs";
import { databasePath, getDatabaseHealth, initializeDatabase, queryReadOnly } from "../src/server/db/sqlite.js";
import { runCreditsMigration } from "../src/server/db/credits-migration.js";

const REQUIRED_TABLES = [
  "schema_migrations",
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

const REQUIRED_INDEXES = [
  "idx_users_email_unique",
  "idx_users_phone_unique",
  "idx_workspace_memberships_user_active",
  "idx_billing_accounts_owner",
  "idx_projects_workspace_active",
  "idx_project_snapshots_project_created",
  "idx_assets_workspace_active",
  "idx_project_assets_asset",
  "idx_ai_jobs_workspace_created",
  "idx_ai_job_assets_asset",
  "idx_credit_transactions_account_created",
  "idx_model_pricing_lookup"
];

if (!existsSync(databasePath)) {
  throw new Error(`SQLite database does not exist: ${databasePath}`);
}

initializeDatabase();
runCreditsMigration();

const database = getDatabaseHealth();

console.log(`database=${databasePath}`);
console.log(`integrity=${database.integrity}`);
for (const [name, count] of Object.entries(database.counts)) {
  console.log(`${name}=${count}`);
}

assert(database.ok, "SQLite health check failed");
assertMissing("table", REQUIRED_TABLES, listObjects("table"));
assertMissing("index", REQUIRED_INDEXES, listObjects("index"));

const schemaVersion = Number(queryReadOnly("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations;")[0]?.version || 0);
assert(schemaVersion >= 4, `schema_migrations version expected >= 4, got ${schemaVersion}`);

const aiJobColumns = listColumns("ai_jobs");
for (const column of ["failure_code", "failure_message", "request_json", "response_json", "duration_ms"]) {
  assert(aiJobColumns.has(column), `ai_jobs missing column: ${column}`);
}

const pricingCount = Number(queryReadOnly("SELECT count(*) AS count FROM model_pricing WHERE enabled = 1;")[0]?.count || 0);
assert(pricingCount > 0, "model_pricing seed is empty");

const missingWorkspaceRows = queryReadOnly(`
  SELECT users.id
  FROM users
  LEFT JOIN workspace_memberships wm
    ON wm.user_id = users.id
    AND wm.deleted_at IS NULL
  LEFT JOIN workspaces w
    ON w.id = wm.workspace_id
    AND w.deleted_at IS NULL
  LEFT JOIN billing_accounts ba
    ON ba.workspace_id = w.id
  WHERE users.deleted_at IS NULL
    AND (wm.id IS NULL OR w.id IS NULL OR ba.id IS NULL);
`);
assert(missingWorkspaceRows.length === 0, `users missing workspace/billing account: ${missingWorkspaceRows.length}`);

const badSnapshots = queryReadOnly(`
  SELECT id
  FROM project_snapshots
  WHERE snapshot_json = ''
     OR json_valid(snapshot_json) = 0;
`);
assert(badSnapshots.length === 0, `invalid project snapshots: ${badSnapshots.length}`);

console.log("db_check=ok");

function listObjects(type) {
  return new Set(queryReadOnly(`
    SELECT name
    FROM sqlite_master
    WHERE type = '${type}';
  `).map((row) => row.name));
}

function listColumns(tableName) {
  return new Set(queryReadOnly(`PRAGMA table_info(${tableName});`).map((row) => row.name));
}

function assertMissing(type, required, actual) {
  const missing = required.filter((name) => !actual.has(name));
  assert(!missing.length, `missing ${type}s: ${missing.join(", ")}`);
}

function assert(condition, message) {
  if (condition) return;
  if (database.foreignKeyIssues) {
    console.error(`foreign_key_issues=${database.foreignKeyIssues}`);
  }
  throw new Error(message);
}
