import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import {
  cpSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { env } from "../config/env.js";
import { backupDatabaseTo, databasePath, getDatabaseHealth } from "../db/sqlite.js";

export async function createDataBackup({
  backupBaseDir = process.env.BACKUP_DIR || join(dirname(databasePath), "backups"),
  uploadDir = env.uploadDir,
  now = new Date()
} = {}) {
  if (!existsSync(databasePath)) {
    throw new Error(`SQLite database does not exist: ${databasePath}`);
  }

  const sourceHealth = getDatabaseHealth();
  if (!sourceHealth.ok) {
    throw new Error(`SQLite source health check failed: ${sourceHealth.integrity}`);
  }

  const backupRoot = join(resolve(backupBaseDir), toBackupTimestamp(now));
  assertBackupOutsideUploads(backupRoot, uploadDir);
  mkdirSync(backupRoot, { recursive: true });

  const databaseFileName = "ai-studio.sqlite";
  const databaseBackupPath = join(backupRoot, databaseFileName);
  await backupDatabaseTo(databaseBackupPath);
  const backupHealth = inspectSqliteDatabase(databaseBackupPath);
  if (!backupHealth.ok) {
    throw new Error(`SQLite backup health check failed: ${backupHealth.integrity}`);
  }

  const uploadsBackupPath = join(backupRoot, "uploads");
  const uploadsBackedUp = existsSync(uploadDir);
  if (uploadsBackedUp) {
    cpSync(uploadDir, uploadsBackupPath, { recursive: true, errorOnExist: true });
  }
  const uploadStats = uploadsBackedUp
    ? collectDirectoryStats(uploadsBackupPath)
    : { fileCount: 0, totalBytes: 0 };

  const manifest = {
    version: 1,
    createdAt: now.toISOString(),
    databasePath,
    databaseBackedUp: true,
    uploadsBackedUp,
    database: {
      backupFile: databaseFileName,
      sizeBytes: statSync(databaseBackupPath).size,
      sha256: await hashFile(databaseBackupPath),
      integrity: backupHealth.integrity,
      foreignKeyIssues: backupHealth.foreignKeyIssues
    },
    uploads: {
      sourcePath: resolve(uploadDir),
      backupDirectory: uploadsBackedUp ? "uploads" : "",
      fileCount: uploadStats.fileCount,
      totalBytes: uploadStats.totalBytes
    }
  };
  writeFileSync(join(backupRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  return { backupRoot, manifest };
}

export function inspectSqliteDatabase(filePath) {
  const database = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = database.pragma("integrity_check", { simple: true }) || "unknown";
    const foreignKeyIssues = database.pragma("foreign_key_check").length;
    return {
      ok: integrity === "ok" && foreignKeyIssues === 0,
      integrity,
      foreignKeyIssues
    };
  } finally {
    database.close();
  }
}

function toBackupTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Backup timestamp must be a valid date");
  return date.toISOString().replace(/[:.]/g, "-");
}

function assertBackupOutsideUploads(backupRoot, uploadDir) {
  const resolvedBackup = resolve(backupRoot);
  const resolvedUploads = resolve(uploadDir);
  if (resolvedBackup === resolvedUploads || resolvedBackup.startsWith(`${resolvedUploads}${sep}`)) {
    throw new Error("Backup directory must not be inside UPLOAD_DIR");
  }
}

function collectDirectoryStats(root) {
  let fileCount = 0;
  let totalBytes = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = collectDirectoryStats(entryPath);
      fileCount += nested.fileCount;
      totalBytes += nested.totalBytes;
    } else if (entry.isFile()) {
      fileCount += 1;
      totalBytes += statSync(entryPath).size;
    }
  }
  return { fileCount, totalBytes };
}

function hashFile(filePath) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}
