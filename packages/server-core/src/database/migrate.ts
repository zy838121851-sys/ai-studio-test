import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { loadRewriteConfig } from "../config/rewrite-config.js";
import { createDatabaseResources } from "./client.js";

const config = loadRewriteConfig(process.env);
const resources = createDatabaseResources(config.databaseUrl);
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

try {
  await migrate(resources.database, { migrationsFolder });
  process.stdout.write("Rewrite database migrations completed.\n");
} finally {
  await resources.pool.end();
}
