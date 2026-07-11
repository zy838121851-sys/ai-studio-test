import { createSign, createVerify } from "node:crypto";

import { ApplicationError } from "../application/application-error.js";
import type { AlipayConfig } from "../config/rewrite-config.js";
import type { PaymentProvider } from "./payment-providers.js";

const GATEWAY = "https://openapi.alipay.com/gateway.do";

export class AlipayProvider implements PaymentProvider {
  readonly name = "alipay" as const;
  constructor(private readonly config: AlipayConfig, private readonly request: typeof fetch = fetch) {}

  async createPayment(input: { orderId: string; amountFen: number; currency: string }) {
    if (input.currency !== "CNY") throw new ApplicationError("ALIPAY_CURRENCY_UNSUPPORTED", 400, "Alipay requires CNY.");
    const result = await this.call<{ alipay_trade_precreate_response?: { code?: string; qr_code?: string } }>("alipay.trade.precreate", { out_trade_no: input.orderId, total_amount: (input.amountFen / 100).toFixed(2), subject: "AI Studio credits" });
    const response = result.alipay_trade_precreate_response;
    if (response?.code !== "10000" || !response.qr_code) throw new ApplicationError("ALIPAY_INVALID_RESPONSE", 502, "Alipay did not return a QR code.");
    return { providerPaymentId: input.orderId, checkoutPayload: { type: "native_qr", codeUrl: response.qr_code } };
  }

  async queryPayment(providerPaymentId: string): Promise<{ status: "pending" | "succeeded" | "failed" }> {
    const result = await this.call<{ alipay_trade_query_response?: { code?: string; trade_status?: string } }>("alipay.trade.query", { out_trade_no: providerPaymentId });
    const status = result.alipay_trade_query_response?.trade_status;
    if (status === "TRADE_SUCCESS" || status === "TRADE_FINISHED") return { status: "succeeded" };
    if (status === "TRADE_CLOSED") return { status: "failed" };
    return { status: "pending" };
  }

  async refund(input: { providerPaymentId: string; refundId: string; amountFen: number }) {
    const result = await this.call<{ alipay_trade_refund_response?: { code?: string; out_trade_no?: string } }>("alipay.trade.refund", { out_trade_no: input.providerPaymentId, out_request_no: input.refundId, refund_amount: (input.amountFen / 100).toFixed(2) });
    if (result.alipay_trade_refund_response?.code !== "10000") throw new ApplicationError("ALIPAY_INVALID_RESPONSE", 502, "Alipay did not confirm the refund.");
    return { providerRefundId: input.refundId };
  }

  async createMandate(): Promise<never> { throw new ApplicationError("ALIPAY_AGREEMENT_NOT_CONFIGURED", 503, "Alipay automatic renewal is not configured."); }

  async verifyWebhook(input: { body: string; signature: string; timestamp: string; nonce: string }) {
    const notification = JSON.parse(input.body) as Record<string, unknown>;
    const canonical = canonicalize(notification);
    const verifier = createVerify("RSA-SHA256"); verifier.update(canonical); verifier.end();
    if (!verifier.verify(this.config.alipayPublicKey, input.signature, "base64")) throw new ApplicationError("INVALID_WEBHOOK_SIGNATURE", 400, "Alipay webhook signature is invalid.");
    const orderId = typeof notification.out_trade_no === "string" ? notification.out_trade_no : undefined;
    const status = notification.trade_status === "TRADE_SUCCESS" || notification.trade_status === "TRADE_FINISHED" ? "payment.succeeded" : "payment.updated";
    if (!orderId || !notification.notify_id) throw new ApplicationError("INVALID_WEBHOOK", 400, "Alipay webhook is incomplete.");
    return { eventId: String(notification.notify_id), eventType: status, payload: { orderId } };
  }

  private async call<T>(method: string, content: Record<string, unknown>): Promise<T> {
    const parameters: Record<string, string> = { app_id: this.config.appId, method, format: "JSON", charset: "utf-8", sign_type: "RSA2", timestamp: formatTimestamp(), version: "1.0", notify_url: this.config.notifyUrl.toString(), biz_content: JSON.stringify(content) };
    const signer = createSign("RSA-SHA256"); signer.update(canonicalize(parameters)); signer.end(); parameters.sign = signer.sign(this.config.appPrivateKey, "base64");
    const response = await this.request(GATEWAY, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(parameters).toString() });
    if (!response.ok) throw new ApplicationError("ALIPAY_REQUEST_FAILED", 502, "Alipay request failed.", { status: response.status });
    return response.json() as Promise<T>;
  }
}

function canonicalize(parameters: Record<string, unknown>): string { return Object.keys(parameters).filter((key) => key !== "sign" && key !== "sign_type" && parameters[key] !== undefined && parameters[key] !== "").sort().map((key) => `${key}=${String(parameters[key])}`).join("&"); }
function formatTimestamp(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; }
