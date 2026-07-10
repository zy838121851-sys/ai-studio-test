import "dotenv/config";
import { closeDatabase } from "../src/server/db/sqlite.js";
import { createDataBackup } from "../src/server/services/data-backup.service.js";

try {
  const { backupRoot, manifest } = await createDataBackup();
  console.log(`Backup created at ${backupRoot}`);
  console.log(`database_sha256=${manifest.database.sha256}`);
  console.log(`uploads=${manifest.uploads.fileCount} files, ${manifest.uploads.totalBytes} bytes`);
} finally {
  closeDatabase();
}
