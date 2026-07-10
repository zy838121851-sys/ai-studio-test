import { describe, expect, it } from "vitest";

import { loadRewriteConfig } from "./rewrite-config.js";

describe("loadRewriteConfig", () => {
  it("provides isolated local infrastructure defaults", () => {
    const config = loadRewriteConfig({ NODE_ENV: "test" });

    expect(config.databaseUrl).toContain("ai_studio_rewrite");
    expect(config.redisUrl).toBe("redis://127.0.0.1:56379");
    expect(config.storage.provider).toBe("local");
  });

  it("rejects local storage for production", () => {
    expect(() =>
      loadRewriteConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:password@database/rewrite",
        REDIS_URL: "rediss://redis.example.com",
        REWRITE_APP_BASE_URL: "https://studio.example.com",
        SESSION_SECRET: "a-production-secret-with-32-characters",
        STORAGE_PROVIDER: "local"
      })
    ).toThrow("Production rewrite must use the OSS storage provider.");
  });
});
