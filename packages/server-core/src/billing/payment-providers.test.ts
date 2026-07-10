import { describe, expect, it } from "vitest";

import { createPaymentProviders, signWebhook, WebhookReplayGuard } from "./payment-providers.js";

describe("payment provider contracts", () => {
  it("fails closed for every production payment provider", async () => {
    const providers = createPaymentProviders("production");
    await expect(providers.wechat.createPayment({ orderId: "order-1", amountFen: 100, currency: "CNY" }))
      .rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(providers.alipay.refund({ providerPaymentId: "p", refundId: "r", amountFen: 100 }))
      .rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
    await expect(providers.renewal.createMandate({ userId: "u", returnUrl: "https://example.com" }))
      .rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED", status: 503 });
  });

  it("verifies development webhook signatures and rejects replay", async () => {
    const secret = "fixture-secret";
    const provider = createPaymentProviders("test", secret).wechat;
    const body = JSON.stringify({ eventId: "event-1", eventType: "payment.succeeded", data: { orderId: "order-1" } });
    const input = { body, timestamp: "1", nonce: "n" };
    await expect(provider.verifyWebhook({ ...input, signature: signWebhook(secret, input) }))
      .resolves.toMatchObject({ eventId: "event-1", eventType: "payment.succeeded" });
    const guard = new WebhookReplayGuard();
    expect(guard.accept("wechat", "event-1")).toBe(true);
    expect(guard.accept("wechat", "event-1")).toBe(false);
  });
});
