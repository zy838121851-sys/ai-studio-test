import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tempRoot = join(tmpdir(), `ai-studio-backup-restore-${process.pid}-${Date.now()}`);
const sourceDatabasePath = join(tempRoot, "source", "ai-studio.sqlite");
const sourceUploadDir = join(tempRoot, "source", "uploads");
const backupBaseDir = join(tempRoot, "backups");
const restoreDatabasePath = join(tempRoot, "restore", "ai-studio.sqlite");
const restoreUploadDir = join(tempRoot, "restore", "uploads");
const uploadContents = Buffer.from("backup restore upload evidence");

process.env.NODE_ENV = "test";
process.env.DB_PATH = sourceDatabasePath;
process.env.UPLOAD_DIR = sourceUploadDir;
process.env.AUTH_CODE_PROVIDER = "mock";

let closeDatabaseRef = null;

try {
  mkdirSync(sourceUploadDir, { recursive: true });
  const { closeDatabase, execute, initializeDatabase } = await import("../src/server/db/sqlite.js");
  const { runCreditsMigration } = await import("../src/server/db/credits-migration.js");
  const { createDataBackup, inspectSqliteDatabase } = await import("../src/server/services/data-backup.service.js");
  closeDatabaseRef = closeDatabase;

  initializeDatabase();
  runCreditsMigration();
  execute("PRAGMA journal_mode = WAL;");
  execute("CREATE TABLE backup_restore_marker (value TEXT NOT NULL);");
  execute("INSERT INTO backup_restore_marker (value) VALUES ('wal-backed-marker');");
  writeFileSync(join(sourceUploadDir, "restore-evidence.txt"), uploadContents);

  const { backupRoot, manifest } = await createDataBackup({
    backupBaseDir,
    now: new Date("2026-01-02T03:04:05.000Z")
  });
  closeDatabase();
  closeDatabaseRef = null;

  assert(manifest.databaseBackedUp, "Backup manifest should confirm the database backup");
  assert(manifest.uploadsBackedUp, "Backup manifest should confirm the uploads backup");
  assert(manifest.uploads.fileCount === 1, "Backup manifest should count uploaded files");
  assert(manifest.uploads.totalBytes === uploadContents.length, "Backup manifest should count uploaded bytes");

  const backedUpDatabasePath = join(backupRoot, manifest.database.backupFile);
  assert(hashFile(backedUpDatabasePath) === manifest.database.sha256, "Backup database checksum should match the manifest");
  assert(inspectSqliteDatabase(backedUpDatabasePath).ok, "Backup database should pass integrity and foreign-key checks");

  mkdirSync(join(tempRoot, "restore"), { recursive: true });
  cpSync(backedUpDatabasePath, restoreDatabasePath);
  cpSync(join(backupRoot, manifest.uploads.backupDirectory), restoreUploadDir, { recursive: true });
  assert(readFileSync(join(restoreUploadDir, "restore-evidence.txt")).equals(uploadContents), "Restored upload should match the source file");

  const restoredDatabase = new Database(restoreDatabasePath, { readonly: true, fileMustExist: true });
  try {
    const marker = restoredDatabase.prepare("SELECT value FROM backup_restore_marker LIMIT 1;").get();
    assert(marker?.value === "wal-backed-marker", "Online backup should include committed WAL data");
  } finally {
    restoredDatabase.close();
  }

  const dbCheck = spawnSync(process.execPath, ["scripts/check-db.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DB_PATH: restoreDatabasePath,
      UPLOAD_DIR: restoreUploadDir,
      DOTENV_CONFIG_PATH: join(tempRoot, ".env.missing")
    },
    encoding: "utf8"
  });
  const dbCheckOutput = `${dbCheck.stdout || ""}${dbCheck.stderr || ""}`;
  assert(dbCheck.status === 0, `Restored database check failed:\n${dbCheckOutput}`);
  assert(dbCheckOutput.includes("db_check=ok"), "Restored database should pass the standard database gate");

  console.log("Backup restore checks passed.");
} finally {
  try {
    closeDatabaseRef?.();
  } catch {
    // Ignore cleanup errors.
  }
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}
