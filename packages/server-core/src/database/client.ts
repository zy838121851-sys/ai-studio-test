import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type RewriteDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseResources {
  pool: Pool;
  database: RewriteDatabase;
}

export function createDatabaseResources(databaseUrl: string): DatabaseResources {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000
  });

  return {
    pool,
    database: drizzle(pool, { schema })
  };
}

export async function checkDatabaseConnection(pool: Pool): Promise<void> {
  await pool.query("select 1 as healthy");
}
