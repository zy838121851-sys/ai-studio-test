import Database from "better-sqlite3";
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { env } from "../config/env.js";
import { databasePath } from "../db/sqlite.js";

export function auditUploadIntegrity({
  sourceDatabasePath = databasePath,
  uploadDir = env.uploadDir,
  appBaseUrl = env.appBaseUrl
} = {}) {
  if (!existsSync(sourceDatabasePath)) {
    throw new Error(`SQLite database does not exist: ${sourceDatabasePath}`);
  }

  const referenceSources = new Map();
  const unsafeReferences = new Set();
  let scannedTextValues = 0;
  const database = new Database(sourceDatabasePath, { readonly: true, fileMustExist: true });
  let scannedTables = 0;
  try {
    for (const tableName of listUserTables(database)) {
      scannedTables += 1;
      for (const columnName of listTextColumns(database, tableName)) {
        const query = `
          SELECT ${quoteIdentifier(columnName)} AS value
          FROM ${quoteIdentifier(tableName)}
          WHERE ${quoteIdentifier(columnName)} LIKE '%uploads%';
        `;
        for (const row of database.prepare(query).iterate()) {
          scannedTextValues += 1;
          const extracted = extractUploadReferences(row.value, { appBaseUrl });
          for (const filePath of extracted.references) {
            if (!referenceSources.has(filePath)) referenceSources.set(filePath, new Set());
            referenceSources.get(filePath).add(`${tableName}.${columnName}`);
          }
          extracted.unsafeReferences.forEach((value) => unsafeReferences.add(value));
        }
      }
    }
  } finally {
    database.close();
  }

  const diskFiles = new Set(listUploadFiles(uploadDir));
  const referencedFiles = new Set(referenceSources.keys());
  const orphanFiles = [...diskFiles].filter((filePath) => !referencedFiles.has(filePath)).sort();
  const missingFiles = [...referencedFiles].filter((filePath) => !diskFiles.has(filePath)).sort();

  return {
    sourceDatabasePath: resolve(sourceDatabasePath),
    uploadDir: resolve(uploadDir),
    scannedTables,
    scannedTextValues,
    referencedFiles: [...referencedFiles].sort(),
    diskFiles: [...diskFiles].sort(),
    orphanFiles,
    missingFiles,
    unsafeReferences: [...unsafeReferences].sort(),
    referenceSources: Object.fromEntries(
      [...referenceSources.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([filePath, sources]) => [filePath, [...sources].sort()])
    )
  };
}

export function extractUploadReferences(value, { appBaseUrl = "" } = {}) {
  const references = new Set();
  const unsafeReferences = new Set();
  let text = String(value || "").replaceAll("\\/", "/").replaceAll("\\", "/");

  text = text.replace(/https?:\/\/[^\s"'<>)}\]]+/gi, (candidate) => {
    try {
      const url = new URL(candidate);
      if (url.pathname.startsWith("/uploads/") && isLocalUploadHost(url, appBaseUrl)) {
        addReference(url.pathname.slice("/uploads/".length), candidate, references, unsafeReferences);
      }
    } catch {
      unsafeReferences.add(candidate);
    }
    return " ";
  });

  const relativePattern = /(?:^|[^A-Za-z0-9])\/?uploads\/([^\s"'<>?#)}\],]+)/gi;
  for (const match of text.matchAll(relativePattern)) {
    addReference(match[1], match[0].trim(), references, unsafeReferences);
  }

  return {
    references: [...references].sort(),
    unsafeReferences: [...unsafeReferences].sort()
  };
}

function listUserTables(database) {
  return database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name;
  `).all().map((row) => row.name);
}

function listTextColumns(database, tableName) {
  return database.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)});`)
    .all()
    .filter((column) => String(column.type || "").toUpperCase().includes("TEXT"))
    .map((column) => column.name);
}

function quoteIdentifier(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function isLocalUploadHost(url, appBaseUrl) {
  const hostname = String(url.hostname || "").toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname)) return true;
  try {
    return Boolean(appBaseUrl && url.host === new URL(appBaseUrl).host);
  } catch {
    return false;
  }
}

function addReference(value, rawValue, references, unsafeReferences) {
  const normalized = normalizeUploadPath(value);
  if (normalized) {
    references.add(normalized);
  } else {
    unsafeReferences.add(String(rawValue || value || ""));
  }
}

function normalizeUploadPath(value) {
  let decoded = String(value || "").trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return "";
  }
  const segments = decoded.replaceAll("\\", "/").split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === ".." || segment.includes("\0"))) {
    return "";
  }
  return segments.join("/");
}

function listUploadFiles(uploadDir) {
  const root = resolve(uploadDir);
  if (!existsSync(root)) return [];
  const files = [];
  visit(root);
  return files;

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (entry.isFile()) {
        files.push(relative(root, entryPath).replaceAll("\\", "/"));
      }
    }
  }
}
