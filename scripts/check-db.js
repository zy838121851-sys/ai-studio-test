import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { databasePath, initializeDatabase } from "../src/server/db/sqlite.js";

function runSql(sql) {
  const result = spawnSync("sqlite3", ["-readonly", "-batch", databasePath], {
    input: sql,
    encoding: "utf8"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || "sqlite3 failed").trim());
  return result.stdout.trim();
}

if (!existsSync(databasePath)) {
  throw new Error(`SQLite database does not exist: ${databasePath}`);
}

initializeDatabase();

const integrity = runSql("PRAGMA integrity_check;\n");
const foreignKeys = runSql(".mode json\nPRAGMA foreign_key_check;\n");
const counts = runSql(`
.headers off
SELECT 'users=' || count(*) FROM users;
SELECT 'sessions=' || count(*) FROM sessions;
SELECT 'user_identities=' || count(*) FROM user_identities;
SELECT 'verification_codes=' || count(*) FROM verification_codes;
SELECT 'oauth_states=' || count(*) FROM oauth_states;
SELECT 'projects=' || count(*) FROM projects;
SELECT 'asset_collections=' || count(*) FROM asset_collections;
SELECT 'assets=' || count(*) FROM assets;
`);

console.log(`database=${databasePath}`);
console.log(`integrity=${integrity}`);
console.log(counts);

if (integrity !== "ok") {
  throw new Error("SQLite integrity_check failed");
}
if (foreignKeys) {
  console.error(foreignKeys);
  throw new Error("SQLite foreign_key_check reported issues");
}
