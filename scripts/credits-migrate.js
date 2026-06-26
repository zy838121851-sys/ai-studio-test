import { initializeDatabase } from "../src/server/db/sqlite.js";
import { backupCreditsDatabase, runCreditsMigration } from "../src/server/db/credits-migration.js";

const backupPath = backupCreditsDatabase();
initializeDatabase();
runCreditsMigration();

console.log(JSON.stringify({
  ok: true,
  backupPath,
  migrated: true
}, null, 2));
