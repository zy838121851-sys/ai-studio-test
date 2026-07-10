import type { Redis } from "ioredis";
import type { Pool } from "pg";

import type { RewriteConfig } from "./config/rewrite-config.js";
import {
  checkDatabaseConnection,
  createDatabaseResources,
  type RewriteDatabase
} from "./database/client.js";
import { checkRedisConnection, createRedisClient } from "./redis/client.js";
import { LocalStorageProvider } from "./storage/local-storage-provider.js";
import { OssStorageProvider } from "./storage/oss-storage-provider.js";
import type { StorageProvider } from "./storage/storage-provider.js";

export type DependencyStatus = "ready" | "unavailable";

export interface ReadinessResult {
  ready: boolean;
  dependencies: {
    database: DependencyStatus;
    redis: DependencyStatus;
    storage: DependencyStatus;
  };
}

export class RewriteInfrastructure {
  readonly pool: Pool;
  readonly database: RewriteDatabase;
  readonly redis: Redis;
  readonly storage: StorageProvider;

  constructor(readonly config: RewriteConfig) {
    const databaseResources = createDatabaseResources(config.databaseUrl);
    this.pool = databaseResources.pool;
    this.database = databaseResources.database;
    this.redis = createRedisClient(config.redisUrl);
    this.storage =
      config.storage.provider === "local"
        ? new LocalStorageProvider(config.storage.rootDirectory)
        : new OssStorageProvider(config.storage);
  }

  async checkReadiness(): Promise<ReadinessResult> {
    const [database, redis, storage] = await Promise.all([
      checkDependency(() => checkDatabaseConnection(this.pool)),
      checkDependency(() => checkRedisConnection(this.redis)),
      checkDependency(() => this.storage.checkHealth())
    ]);

    return {
      ready: database === "ready" && redis === "ready" && storage === "ready",
      dependencies: { database, redis, storage }
    };
  }

  async close(): Promise<void> {
    if (this.redis.status === "ready") {
      await this.redis.quit();
    } else {
      this.redis.disconnect();
    }
    await this.pool.end();
  }
}

async function checkDependency(check: () => Promise<void>): Promise<DependencyStatus> {
  try {
    await check();
    return "ready";
  } catch {
    return "unavailable";
  }
}
