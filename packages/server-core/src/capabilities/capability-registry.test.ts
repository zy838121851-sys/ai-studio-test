import { describe, expect, it } from "vitest";

import type { RewriteConfig } from "../config/rewrite-config.js";
import { CapabilityRegistry, createCapabilityRegistry } from "./capability-registry.js";

describe("CapabilityRegistry", () => {
  it("allows development and configured providers outside production", () => {
    const registry = new CapabilityRegistry("development", {
      "object-storage": "development",
      "image-generation": "configured"
    });

    expect(registry.get("object-storage")).toMatchObject({
      status: "development",
      actionAllowed: true,
      reason: "available"
    });
    expect(registry.get("image-generation")).toMatchObject({
      status: "configured",
      actionAllowed: true,
      reason: "available"
    });
    expect(registry.get("wechat-pay")).toMatchObject({
      status: "disabled",
      actionAllowed: false,
      reason: "provider-disabled"
    });
  });

  it("allows only verified providers in production", () => {
    const registry = new CapabilityRegistry("production", {
      "object-storage": "configured",
      "image-generation": "verified",
      "email-identity": "development"
    });

    expect(registry.get("object-storage")).toMatchObject({
      actionAllowed: false,
      reason: "live-verification-required"
    });
    expect(registry.get("image-generation")).toMatchObject({
      actionAllowed: true,
      reason: "available"
    });
    expect(registry.get("email-identity")).toMatchObject({
      actionAllowed: false,
      reason: "development-provider-not-allowed"
    });
    expect(() => registry.assertActionAllowed("object-storage")).toThrow(
      "The requested capability is not available."
    );
  });

  it("derives current providers without exposing credentials", () => {
    const registry = createCapabilityRegistry({
      nodeEnvironment: "production",
      apiHost: "127.0.0.1",
      apiPort: 4100,
      appBaseUrl: new URL("https://studio.example.com"),
      databaseUrl: "postgres://secret-database",
      redisUrl: "rediss://secret-redis",
      sessionSecret: "secret-session-value",
      storage: {
        provider: "oss",
        region: "oss-cn-shanghai",
        bucket: "private-bucket",
        accessKeyId: "secret-access-key-id",
        accessKeySecret: "secret-access-key-value",
        endpoint: undefined
      },
      imageProvider: {
        provider: "apimart",
        apiKey: "secret-provider-key",
        baseUrl: new URL("https://api.example.com")
      },
      workerConcurrency: 2
    } satisfies RewriteConfig);

    const serialized = JSON.stringify(registry.toDto());
    expect(registry.get("object-storage").status).toBe("configured");
    expect(registry.get("image-generation").status).toBe("configured");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("private-bucket");
    expect(serialized).not.toContain("api.example.com");
  });
});
