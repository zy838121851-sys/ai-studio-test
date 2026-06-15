import { databasePath, initializeDatabase } from "../src/server/db/sqlite.js";

initializeDatabase();
console.log(`SQLite database initialized at ${databasePath}`);
