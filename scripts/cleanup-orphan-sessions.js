import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { cleanupExpiredOrphanSessions, databasePath, getDatabaseHealth } from "../src/server/db/sqlite.js";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const backupRoot = join(process.cwd(), "data", "backups", timestamp());
mkdirSync(backupRoot, { recursive: true });
if (existsSync(databasePath)) {
  copyFileSync(databasePath, join(backupRoot, "ai-studio-before-session-cleanup.sqlite"));
}

const removed = cleanupExpiredOrphanSessions();
const health = getDatabaseHealth();

console.log(`Backed up database to ${backupRoot}`);
console.log(`Removed expired orphan sessions: ${removed}`);
console.log(`integrity=${health.integrity}`);
console.log(`foreignKeyIssues=${health.foreignKeyIssues}`);

if (!health.ok) {
  throw new Error("Database health check failed after orphan session cleanup");
}
