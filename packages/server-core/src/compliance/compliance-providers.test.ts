import { describe, expect, it } from "vitest";

import { createComplianceProviders } from "./compliance-providers.js";

describe("compliance provider seams", () => {
  it("provides deterministic development moderation and notification", async () => {
    const providers = createComplianceProviders("development");
    await expect(providers.moderation.inspect({
      subjectType: "prompt",
      subjectId: "prompt-1",
      contentHash: "hash"
    })).resolves.toMatchObject({ decision: "passed", provider: "development" });
    await expect(providers.notification.deliver({
      channel: "in_app",
      recipient: "user-1",
      templateKey: "job.completed",
      payload: {}
    })).resolves.toEqual({ provider: "development", providerReference: null });
  });

  it("fails closed in production until providers are configured", async () => {
    const providers = createComplianceProviders("production");
    await expect(providers.moderation.inspect({
      subjectType: "prompt",
      subjectId: "prompt-1",
      contentHash: "hash"
    })).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(providers.notification.deliver({
      channel: "email",
      recipient: "creator@example.com",
      templateKey: "job.completed",
      payload: {}
    })).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
  });
});
