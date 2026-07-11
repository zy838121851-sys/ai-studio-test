import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import { AlipayProvider } from "./alipay-provider.js";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config = { appId: "app-1", appPrivateKey: keys.privateKey.export({ type: "pkcs1", format: "pem" }).toString(), alipayPublicKey: keys.publicKey.export({ type: "spki", format: "pem" }).toString(), notifyUrl: new URL("https://studio.example.com/api/v1/billing/webhooks/alipay"), liveVerified: false };

describe("AlipayProvider", () => {
  it("creates a signed precreate QR request", async () => {
    const request = async (_url: string | URL | Request, init?: RequestInit) => {
      const form = new URLSearchParams(String(init?.body));
      expect(form.get("method")).toBe("alipay.trade.precreate");
      expect(form.get("sign_type")).toBe("RSA2");
      expect(form.get("sign")).toBeTruthy();
      return new Response(JSON.stringify({ alipay_trade_precreate_response: { code: "10000", qr_code: "https://qr.alipay.com/fixture" } }));
    };
    const provider = new AlipayProvider(config, request as typeof fetch);
    await expect(provider.createPayment({ orderId: "order-1", amountFen: 1200, currency: "CNY" })).resolves.toEqual({ providerPaymentId: "order-1", checkoutPayload: { type: "native_qr", codeUrl: "https://qr.alipay.com/fixture" } });
  });

  it("verifies a signed asynchronous payment notification", async () => {
    const payload: Record<string, string> = { notify_id: "notify-1", out_trade_no: "order-2", trade_status: "TRADE_SUCCESS", sign_type: "RSA2" };
    const canonical = "notify_id=notify-1&out_trade_no=order-2&trade_status=TRADE_SUCCESS";
    const signature = sign("RSA-SHA256", Buffer.from(canonical), keys.privateKey).toString("base64");
    const provider = new AlipayProvider(config);
    await expect(provider.verifyWebhook({ body: JSON.stringify(payload), signature, timestamp: "", nonce: "" })).resolves.toEqual({ eventId: "notify-1", eventType: "payment.succeeded", payload: { orderId: "order-2" } });
  });
});
