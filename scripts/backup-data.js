import "dotenv/config";
import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { databasePath } from "../src/server/db/sqlite.js";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const backupRoot = join(process.cwd(), "data", "backups", timestamp());
mkdirSync(backupRoot, { recursive: true });

if (existsSync(databasePath)) {
  copyFileSync(databasePath, join(backupRoot, "ai-studio.sqlite"));
}

const uploadsPath = join(process.cwd(), "uploads");
if (existsSync(uploadsPath)) {
  cpSync(uploadsPath, join(backupRoot, "uploads"), { recursive: true });
}

writeFileSync(join(backupRoot, "manifest.json"), JSON.stringify({
  createdAt: new Date().toISOString(),
  databasePath,
  databaseBackedUp: existsSync(join(backupRoot, "ai-studio.sqlite")),
  uploadsBackedUp: existsSync(join(backupRoot, "uploads"))
}, null, 2));

console.log(`Backup created at ${backupRoot}`);
