import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteNodeEnvironment } from "../config/rewrite-config.js";
import type { CapabilityRegistry } from "../capabilities/capability-registry.js";
import type { RewriteDatabase } from "../database/client.js";
import {
  billingOrders,
  creditAccounts,
  creditLedger,
  entitlements,
  paymentEvents,
  payments,
  prices
} from "../database/schema.js";
import { createPaymentProviders, type PaymentProviderName, type PaymentProviders } from "./payment-providers.js";
import { transitionOrder, transitionPayment } from "./billing-domain.js";

export interface CreateOrderPaymentInput {
  priceId: string;
  provider: Extract<PaymentProviderName, "wechat" | "alipay">;
  idempotencyKey: string;
}

export interface OrderPaymentDto {
  orderId: string;
  paymentId: string;
  provider: "wechat" | "alipay";
  status: "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
  amountFen: number;
  currency: string;
  checkoutPayload: Record<string, unknown>;
}

export interface ProcessPaymentWebhookInput {
  provider: PaymentProviderName;
  body: string;
  signature: string;
  timestamp: string;
  nonce: string;
}

export class OrderPaymentService {
  private readonly providers: PaymentProviders;

  constructor(
    private readonly database: RewriteDatabase,
    environment: RewriteNodeEnvironment,
    providers = createPaymentProviders(environment),
    private readonly capabilities?: CapabilityRegistry
  ) {
    this.providers = providers;
  }

  async create(context: AuthContext, input: CreateOrderPaymentInput): Promise<OrderPaymentDto> {
    this.capabilities?.assertActionAllowed(input.provider === "wechat" ? "wechat-pay" : "alipay");
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const provider = this.providers[input.provider];
    const [existing] = await this.database
      .select({
        orderId: billingOrders.id,
        paymentId: payments.id,
        provider: payments.provider,
        status: payments.status,
        amountFen: payments.amountFen,
        currency: payments.currency,
        rawResult: payments.rawResult
      })
      .from(billingOrders)
      .innerJoin(payments, eq(payments.orderId, billingOrders.id))
      .where(and(eq(billingOrders.workspaceId, context.workspaceId), eq(billingOrders.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (existing) return toOrderPaymentDto(existing);

    const [price] = await this.database
      .select()
      .from(prices)
      .where(and(eq(prices.id, input.priceId), eq(prices.active, 1)))
      .limit(1);
    if (!price) throw new ApplicationError("PRICE_NOT_FOUND", 404, "Price is not available.");

    // Calling the provider before persisting means an unconfigured production provider leaves no pending order behind.
    const provisionalOrderId = randomUUID();
    const checkout = await provider.createPayment({
      orderId: provisionalOrderId,
      amountFen: price.amountFen,
      currency: price.currency
    });

    return this.database.transaction(async (transaction) => {
      const [raced] = await transaction
        .select({
          orderId: billingOrders.id,
          paymentId: payments.id,
          provider: payments.provider,
          status: payments.status,
          amountFen: payments.amountFen,
          currency: payments.currency,
          rawResult: payments.rawResult
        })
        .from(billingOrders)
        .innerJoin(payments, eq(payments.orderId, billingOrders.id))
        .where(and(eq(billingOrders.workspaceId, context.workspaceId), eq(billingOrders.idempotencyKey, idempotencyKey)))
        .limit(1);
      if (raced) return toOrderPaymentDto(raced);

      const [order] = await transaction
        .insert(billingOrders)
        .values({
          id: provisionalOrderId,
          workspaceId: context.workspaceId,
          userId: context.userId,
          priceId: price.id,
          currency: price.currency,
          amountFen: price.amountFen,
          credits: price.credits,
          idempotencyKey,
          expiresAt: new Date(Date.now() + 30 * 60 * 1_000)
        })
        .returning();
      if (!order) throw new ApplicationError("ORDER_CREATE_FAILED", 500, "Unable to create order.");
      const [payment] = await transaction
        .insert(payments)
        .values({
          orderId: order.id,
          provider: input.provider,
          providerPaymentId: checkout.providerPaymentId,
          amountFen: price.amountFen,
          currency: price.currency,
          idempotencyKey: `payment:${idempotencyKey}:${input.provider}`,
          rawResult: { checkoutPayload: checkout.checkoutPayload }
        })
        .returning();
      if (!payment) throw new ApplicationError("PAYMENT_CREATE_FAILED", 500, "Unable to create payment.");
      return toOrderPaymentDto({
        orderId: order.id,
        paymentId: payment.id,
        provider: payment.provider,
        status: payment.status,
        amountFen: payment.amountFen,
        currency: payment.currency,
        rawResult: payment.rawResult
      });
    });
  }

  async processWebhook(input: ProcessPaymentWebhookInput): Promise<{ duplicate: boolean }> {
    const verified = await this.providers[input.provider].verifyWebhook(input);
    const [createdEvent] = await this.database
      .insert(paymentEvents)
      .values({
        provider: input.provider,
        providerEventId: verified.eventId,
        eventType: verified.eventType,
        payload: verified.payload
      })
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });
    if (!createdEvent) return { duplicate: true };

    if (verified.eventType !== "payment.succeeded") return { duplicate: false };
    const orderId = typeof verified.payload.orderId === "string" ? verified.payload.orderId : null;
    if (!orderId) throw new ApplicationError("INVALID_PAYMENT_WEBHOOK", 400, "Payment webhook is missing orderId.");

    await this.database.transaction(async (transaction) => {
      const [record] = await transaction
        .select({ order: billingOrders, payment: payments })
        .from(billingOrders)
        .innerJoin(payments, eq(payments.orderId, billingOrders.id))
        .where(and(eq(billingOrders.id, orderId), eq(payments.provider, input.provider)))
        .for("update")
        .limit(1);
      if (!record) throw new ApplicationError("PAYMENT_NOT_FOUND", 404, "Payment order does not exist.");
      if (record.payment.status === "succeeded") return;

      const now = new Date();
      await transaction
        .update(payments)
        .set({ status: transitionPayment(record.payment.status, "succeeded"), updatedAt: now })
        .where(eq(payments.id, record.payment.id));
      await transaction
        .update(billingOrders)
        .set({ status: transitionOrder(record.order.status, "paid"), updatedAt: now })
        .where(eq(billingOrders.id, record.order.id));
      await transaction
        .insert(entitlements)
        .values({
          workspaceId: record.order.workspaceId,
          sourceType: "billing_order",
          sourceId: record.order.id,
          entitlementKey: "credits",
          quantity: record.order.credits,
          status: "active",
          startsAt: now
        })
        .onConflictDoNothing();

      if (record.order.credits > 0) {
        const [account] = await transaction
          .select()
          .from(creditAccounts)
          .where(eq(creditAccounts.workspaceId, record.order.workspaceId))
          .for("update")
          .limit(1);
        if (!account) throw new ApplicationError("CREDIT_ACCOUNT_NOT_FOUND", 500, "Credit account does not exist.");
        const balanceAfter = account.balance + record.order.credits;
        await transaction
          .update(creditAccounts)
          .set({ balance: balanceAfter, version: account.version + 1, updatedAt: now })
          .where(eq(creditAccounts.id, account.id));
        await transaction
          .insert(creditLedger)
          .values({
            workspaceId: record.order.workspaceId,
            entryType: "grant",
            amount: record.order.credits,
            reservedDelta: 0,
            balanceAfter,
            reservedAfter: account.reserved,
            idempotencyKey: `payment:${record.payment.id}:grant`,
            referenceType: "billing_order",
            referenceId: record.order.id,
            metadata: { paymentId: record.payment.id }
          })
          .onConflictDoNothing();
      }
    });
    await this.database.update(paymentEvents).set({ processedAt: new Date() }).where(eq(paymentEvents.id, createdEvent.id));
    return { duplicate: false };
  }
}

function normalizeIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 160) {
    throw new ApplicationError("INVALID_IDEMPOTENCY_KEY", 400, "A valid Idempotency-Key is required.");
  }
  return normalized;
}

function toOrderPaymentDto(row: {
  orderId: string;
  paymentId: string;
  provider: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
  amountFen: number;
  currency: string;
  rawResult: Record<string, unknown>;
}): OrderPaymentDto {
  const checkoutPayload = row.rawResult.checkoutPayload;
  return {
    orderId: row.orderId,
    paymentId: row.paymentId,
    provider: row.provider as "wechat" | "alipay",
    status: row.status,
    amountFen: row.amountFen,
    currency: row.currency,
    checkoutPayload: checkoutPayload && typeof checkoutPayload === "object" ? checkoutPayload as Record<string, unknown> : {}
  };
}
