import { createCipheriv, generateKeyPairSync, randomBytes, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import { WeChatPayProvider } from "./wechat-pay-provider.js";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config = {
  merchantId: "1900000001",
  appId: "wx-example",
  merchantSerialNumber: "merchant-serial",
  merchantPrivateKey: keys.privateKey.export({ type: "pkcs1", format: "pem" }).toString(),
  platformCertificate: keys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  platformCertificateSerial: "platform-serial",
  apiV3Key: "0123456789abcdefghijklmnopqrstuv",
  notifyUrl: new URL("https://studio.example.com/api/v1/billing/webhooks/wechat"),
  liveVerified: false
};

describe("WeChatPayProvider", () => {
  it("builds a signed Native checkout request", async () => {
    const request = async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: expect.stringContaining("WECHATPAY2-SHA256-RSA2048") });
      expect(JSON.parse(String(init?.body))).toMatchObject({ out_trade_no: "order-1", amount: { total: 1200, currency: "CNY" } });
      return new Response(JSON.stringify({ code_url: "weixin://wxpay/bizpayurl?pr=fixture" }), { status: 200 });
    };
    const provider = new WeChatPayProvider(config, request as typeof fetch);
    await expect(provider.createPayment({ orderId: "order-1", amountFen: 1200, currency: "CNY" })).resolves.toEqual({ providerPaymentId: "order-1", checkoutPayload: { type: "native_qr", codeUrl: "weixin://wxpay/bizpayurl?pr=fixture" } });
  });

  it("verifies a signed and encrypted transaction notification", async () => {
    const nonce = randomBytes(12).toString("hex");
    const associatedData = "transaction";
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(config.apiV3Key), Buffer.from(nonce));
    cipher.setAAD(Buffer.from(associatedData));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify({ out_trade_no: "order-2" })), cipher.final(), cipher.getAuthTag()]).toString("base64");
    const body = JSON.stringify({ id: "event-1", event_type: "TRANSACTION.SUCCESS", resource: { associated_data: associatedData, nonce, ciphertext: encrypted } });
    const timestamp = "1710000000";
    const requestNonce = "notify-nonce";
    const signature = sign("RSA-SHA256", Buffer.from(`${timestamp}\n${requestNonce}\n${body}\n`), keys.privateKey).toString("base64");
    const provider = new WeChatPayProvider(config);
    await expect(provider.verifyWebhook({ body, timestamp, nonce: requestNonce, signature, serial: "platform-serial" })).resolves.toEqual({ eventId: "event-1", eventType: "payment.succeeded", payload: { orderId: "order-2" } });
  });
});
