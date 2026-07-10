import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller.js";
import type { PlatformService } from "./platform.service.js";

const platform = {
  checkReadiness: async () => ({
    ready: true,
    dependencies: { database: "ready", redis: "ready", storage: "ready" }
  })
} as PlatformService;

describe("HealthController", () => {
  it("reports the rewrite API as healthy", () => {
    expect(new HealthController(platform).getHealth()).toEqual({
      service: "ai-studio-rewrite-api",
      status: "ok"
    });
  });

  it("reports dependency readiness", async () => {
    await expect(new HealthController(platform).getReadiness()).resolves.toMatchObject({
      status: "ok",
      dependencies: { database: "ready", redis: "ready", storage: "ready" }
    });
  });
});
