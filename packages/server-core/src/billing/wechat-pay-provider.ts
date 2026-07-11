import { createDecipheriv, createSign, createVerify, randomBytes } from "node:crypto";

import { ApplicationError } from "../application/application-error.js";
import type { WeChatPayConfig } from "../config/rewrite-config.js";
import type { PaymentProvider } from "./payment-providers.js";

const API_BASE = "https://api.mch.weixin.qq.com";

export class WeChatPayProvider implements PaymentProvider {
  readonly name = "wechat" as const;

  constructor(private readonly config: WeChatPayConfig, private readonly request: typeof fetch = fetch) {}

  async createPayment(input: { orderId: string; amountFen: number; currency: string }) {
    if (input.currency !== "CNY") throw new ApplicationError("WECHATPAY_CURRENCY_UNSUPPORTED", 400, "WeChat Pay requires CNY.");
    const response = await this.call<{ code_url?: string }>("POST", "/v3/pay/transactions/native", {
      appid: this.config.appId,
      mchid: this.config.merchantId,
      description: "AI Studio credits",
      out_trade_no: input.orderId,
      notify_url: this.config.notifyUrl.toString(),
      amount: { total: input.amountFen, currency: input.currency }
    });
    if (!response.code_url) throw new ApplicationError("WECHATPAY_INVALID_RESPONSE", 502, "WeChat Pay did not return a code URL.");
    return { providerPaymentId: input.orderId, checkoutPayload: { type: "native_qr", codeUrl: response.code_url } };
  }

  async queryPayment(providerPaymentId: string): Promise<{ status: "pending" | "succeeded" | "failed" }> {
    const data = await this.call<{ trade_state?: string }>("GET", `/v3/pay/transactions/out-trade-no/${encodeURIComponent(providerPaymentId)}?mchid=${encodeURIComponent(this.config.merchantId)}`);
    if (data.trade_state === "SUCCESS") return { status: "succeeded" };
    if (["CLOSED", "REVOKED", "PAYERROR"].includes(data.trade_state ?? "")) return { status: "failed" };
    return { status: "pending" };
  }

  async refund(input: { providerPaymentId: string; refundId: string; amountFen: number }) {
    const data = await this.call<{ refund_id?: string }>("POST", "/v3/refund/domestic/refunds", {
      out_trade_no: input.providerPaymentId,
      out_refund_no: input.refundId,
      amount: { refund: input.amountFen, total: input.amountFen, currency: "CNY" }
    });
    if (!data.refund_id) throw new ApplicationError("WECHATPAY_INVALID_RESPONSE", 502, "WeChat Pay did not return a refund ID.");
    return { providerRefundId: data.refund_id };
  }

  async createMandate(): Promise<never> {
    throw new ApplicationError("WECHATPAY_MANDATE_NOT_CONFIGURED", 503, "WeChat Pay automatic renewal is not configured.");
  }

  async verifyWebhook(input: { body: string; signature: string; timestamp: string; nonce: string; serial?: string }) {
    if (input.serial && input.serial !== this.config.platformCertificateSerial) {
      throw new ApplicationError("INVALID_WEBHOOK_SIGNATURE", 400, "Unexpected WeChat Pay platform certificate serial.");
    }
    const message = `${input.timestamp}\n${input.nonce}\n${input.body}\n`;
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    verifier.end();
    if (!verifier.verify(this.config.platformCertificate, input.signature, "base64")) {
      throw new ApplicationError("INVALID_WEBHOOK_SIGNATURE", 400, "WeChat Pay webhook signature is invalid.");
    }
    const envelope = JSON.parse(input.body) as { id?: string; event_type?: string; resource?: { associated_data?: string; nonce?: string; ciphertext?: string } };
    const decrypted = decryptResource(this.config.apiV3Key, envelope.resource);
    const transaction = JSON.parse(decrypted) as { out_trade_no?: string };
    if (!envelope.id || !envelope.event_type || !transaction.out_trade_no) {
      throw new ApplicationError("INVALID_WEBHOOK", 400, "WeChat Pay webhook is incomplete.");
    }
    return {
      eventId: envelope.id,
      eventType: envelope.event_type === "TRANSACTION.SUCCESS" ? "payment.succeeded" : "payment.updated",
      payload: { orderId: transaction.out_trade_no }
    };
  }

  private async call<T>(method: "GET" | "POST", path: string, payload?: Record<string, unknown>): Promise<T> {
    const body = payload ? JSON.stringify(payload) : "";
    const timestamp = Math.floor(Date.now() / 1_000).toString();
    const nonce = randomBytes(16).toString("hex");
    const signer = createSign("RSA-SHA256");
    signer.update(`${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`);
    signer.end();
    const signature = signer.sign(this.config.merchantPrivateKey, "base64");
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.merchantId}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${this.config.merchantSerialNumber}",signature="${signature}"`;
    const response = await this.request(`${API_BASE}${path}`, { method, headers: { Authorization: authorization, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body } : {}) });
    if (!response.ok) throw new ApplicationError("WECHATPAY_REQUEST_FAILED", 502, "WeChat Pay request failed.", { status: response.status });
    return response.json() as Promise<T>;
  }
}

function decryptResource(key: string, resource: { associated_data?: string; nonce?: string; ciphertext?: string } | undefined): string {
  if (!resource?.nonce || !resource.ciphertext) throw new ApplicationError("INVALID_WEBHOOK", 400, "WeChat Pay webhook resource is missing.");
  const payload = Buffer.from(resource.ciphertext, "base64");
  const ciphertext = payload.subarray(0, -16);
  const tag = payload.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "utf8"), Buffer.from(resource.nonce, "utf8"));
  decipher.setAuthTag(tag);
  decipher.setAAD(Buffer.from(resource.associated_data ?? "", "utf8"));
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
