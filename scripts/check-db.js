import "dotenv/config";
import { existsSync } from "node:fs";
import { databasePath, getDatabaseHealth, initializeDatabase } from "../src/server/db/sqlite.js";

if (!existsSync(databasePath)) {
  throw new Error(`SQLite database does not exist: ${databasePath}`);
}

initializeDatabase();

const database = getDatabaseHealth();

console.log(`database=${databasePath}`);
console.log(`integrity=${database.integrity}`);
for (const [name, count] of Object.entries(database.counts)) {
  console.log(`${name}=${count}`);
}

if (!database.ok) {
  if (database.foreignKeyIssues) {
    console.error(`foreign_key_issues=${database.foreignKeyIssues}`);
  }
  throw new Error("SQLite health check failed");
}
