import "dotenv/config";
import { closeDatabase, databasePath, resetDatabase } from "../src/server/db/sqlite.js";
import { runCreditsMigration } from "../src/server/db/credits-migration.js";

if (!isResetAllowed()) {
  console.error("Refusing to reset database. Set AI_STUDIO_ALLOW_DB_RESET=true to confirm this is test data.");
  process.exit(1);
}

const { backupPath } = resetDatabase({ backup: true });
runCreditsMigration();
closeDatabase();

console.log(JSON.stringify({
  ok: true,
  database: databasePath,
  backupPath
}, null, 2));

function isResetAllowed() {
  return ["1", "true", "yes", "on"].includes(String(process.env.AI_STUDIO_ALLOW_DB_RESET || "").trim().toLowerCase());
}
