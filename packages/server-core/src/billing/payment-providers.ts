import { createHmac, timingSafeEqual } from "node:crypto";

import { ApplicationError } from "../application/application-error.js";
import type { WeChatPayConfig } from "../config/rewrite-config.js";
import { WeChatPayProvider } from "./wechat-pay-provider.js";

export type PaymentProviderName = "wechat" | "alipay" | "renewal";

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createPayment(input: { orderId: string; amountFen: number; currency: string }): Promise<{
    providerPaymentId: string;
    checkoutPayload: Record<string, unknown>;
  }>;
  queryPayment(providerPaymentId: string): Promise<{ status: "pending" | "succeeded" | "failed" }>;
  refund(input: { providerPaymentId: string; refundId: string; amountFen: number }): Promise<{
    providerRefundId: string;
  }>;
  createMandate(input: { userId: string; returnUrl: string }): Promise<{ providerMandateId: string }>;
  verifyWebhook(input: { body: string; signature: string; timestamp: string; nonce: string; serial?: string }): Promise<{
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }>;
}

export interface PaymentProviders {
  wechat: PaymentProvider;
  alipay: PaymentProvider;
  renewal: PaymentProvider;
}

export function createPaymentProviders(
  environment: "development" | "test" | "production",
  secret = "",
  wechatPay?: WeChatPayConfig
):
  PaymentProviders {
  if (environment === "production") {
    return {
      wechat: wechatPay ? new WeChatPayProvider(wechatPay) : new UnconfiguredPaymentProvider("wechat"),
      alipay: new UnconfiguredPaymentProvider("alipay"),
      renewal: new UnconfiguredPaymentProvider("renewal")
    };
  }
  return {
    wechat: new DevelopmentPaymentProvider("wechat", secret || "development-wechat-secret"),
    alipay: new DevelopmentPaymentProvider("alipay", secret || "development-alipay-secret"),
    renewal: new DevelopmentPaymentProvider("renewal", secret || "development-renewal-secret")
  };
}

export function signWebhook(secret: string, input: { body: string; timestamp: string; nonce: string }): string {
  return createHmac("sha256", secret)
    .update(`${input.timestamp}.${input.nonce}.${input.body}`)
    .digest("hex");
}

export class WebhookReplayGuard {
  private readonly seen = new Set<string>();

  accept(provider: PaymentProviderName, eventId: string): boolean {
    const key = `${provider}:${eventId}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
}

class DevelopmentPaymentProvider implements PaymentProvider {
  constructor(readonly name: PaymentProviderName, private readonly secret: string) {}

  async createPayment(input: { orderId: string; amountFen: number; currency: string }) {
    return {
      providerPaymentId: `development:${this.name}:${input.orderId}`,
      checkoutPayload: { provider: this.name, amountFen: input.amountFen, currency: input.currency }
    };
  }

  async queryPayment(): Promise<{ status: "pending" }> {
    return { status: "pending" };
  }

  async refund(input: { providerPaymentId: string; refundId: string; amountFen: number }) {
    return { providerRefundId: `development-refund:${input.refundId}` };
  }

  async createMandate(input: { userId: string; returnUrl: string }) {
    return { providerMandateId: `development-mandate:${this.name}:${input.userId}` };
  }

  async verifyWebhook(input: { body: string; signature: string; timestamp: string; nonce: string }) {
    const expected = signWebhook(this.secret, input);
    const valid = expected.length === input.signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
    if (!valid) throw new ApplicationError("INVALID_WEBHOOK_SIGNATURE", 400, "Webhook 签名无效。");
    const payload = JSON.parse(input.body) as { eventId?: string; eventType?: string; data?: Record<string, unknown> };
    if (!payload.eventId || !payload.eventType) throw new ApplicationError("INVALID_WEBHOOK", 400, "Webhook 缺少事件标识。");
    return { eventId: payload.eventId, eventType: payload.eventType, payload: payload.data ?? {} };
  }
}

class UnconfiguredPaymentProvider implements PaymentProvider {
  constructor(readonly name: PaymentProviderName) {}
  async createPayment(): Promise<never> { throwProviderNotConfigured(); }
  async queryPayment(): Promise<never> { throwProviderNotConfigured(); }
  async refund(): Promise<never> { throwProviderNotConfigured(); }
  async createMandate(): Promise<never> { throwProviderNotConfigured(); }
  async verifyWebhook(): Promise<never> { throwProviderNotConfigured(); }
}

function throwProviderNotConfigured(): never {
  throw new ApplicationError("PROVIDER_NOT_CONFIGURED", 503, "生产支付 Provider 尚未配置。");
}
