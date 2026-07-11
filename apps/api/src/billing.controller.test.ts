import { describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@ai-studio/server-core";

import { BillingController } from "./billing.controller.js";
import type { PlatformService } from "./platform.service.js";

const auth = {
  userId: "user-1",
  workspaceId: "workspace-1",
  email: "user@example.com",
  displayName: "User",
  workspaceName: "Workspace",
  sessionId: "session-1"
};

describe("BillingController", () => {
  it("requires an idempotency key before creating a payment attempt", () => {
    const controller = new BillingController({} as PlatformService);
    expect(() => controller.createOrder(auth, undefined, { priceId: "5e142d3a-354e-4012-a9f3-7f01618b57e6", provider: "wechat" })).toThrow(ApplicationError);
  });

  it("passes checkout and verified webhooks to the payment orchestrator", async () => {
    const create = vi.fn().mockResolvedValue({ orderId: "order-1" });
    const processWebhook = vi.fn().mockResolvedValue({ duplicate: false });
    const controller = new BillingController({ orderPayments: { create, processWebhook } } as unknown as PlatformService);
    await expect(controller.createOrder(auth, "checkout-1", { priceId: "5e142d3a-354e-4012-a9f3-7f01618b57e6", provider: "alipay" })).resolves.toEqual({ orderId: "order-1" });
    await expect(controller.processWebhook("wechat", "signature", "1", "nonce", undefined, { eventId: "evt-1" })).resolves.toEqual({ duplicate: false });
    expect(create).toHaveBeenCalledWith(auth, { priceId: "5e142d3a-354e-4012-a9f3-7f01618b57e6", provider: "alipay", idempotencyKey: "checkout-1" });
    expect(processWebhook).toHaveBeenCalledWith({ provider: "wechat", signature: "signature", timestamp: "1", nonce: "nonce", body: JSON.stringify({ eventId: "evt-1" }) });
  });
});
