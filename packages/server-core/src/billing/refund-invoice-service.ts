import { and, eq, sum } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { billingOrders, invoiceRequests, payments, refunds } from "../database/schema.js";
import type { PaymentProviders } from "./payment-providers.js";

export class RefundInvoiceService {
  constructor(private readonly database: RewriteDatabase, private readonly providers: PaymentProviders) {}

  async requestRefund(context: AuthContext, input: { paymentId: string; amountFen: number; reason: string; idempotencyKey: string }) {
    if (!Number.isSafeInteger(input.amountFen) || input.amountFen <= 0) throw new ApplicationError("INVALID_REFUND_AMOUNT", 400, "Refund amount must be a positive integer in fen.");
    const existing = await this.database.query.refunds.findFirst({ where: (table, { eq }) => eq(table.idempotencyKey, input.idempotencyKey) });
    if (existing) return existing;
    const [payment] = await this.database.select({ payment: payments, order: billingOrders }).from(payments).innerJoin(billingOrders, eq(billingOrders.id, payments.orderId)).where(and(eq(payments.id, input.paymentId), eq(billingOrders.workspaceId, context.workspaceId))).limit(1);
    if (!payment) throw new ApplicationError("PAYMENT_NOT_FOUND", 404, "Payment does not exist.");
    if (payment.payment.status !== "succeeded" || !payment.payment.providerPaymentId) throw new ApplicationError("PAYMENT_NOT_REFUNDABLE", 409, "Payment is not refundable.");
    const [aggregate] = await this.database.select({ amount: sum(refunds.amountFen) }).from(refunds).where(and(eq(refunds.paymentId, payment.payment.id), eq(refunds.status, "succeeded")));
    const refunded = Number(aggregate?.amount ?? 0);
    if (refunded + input.amountFen > payment.payment.amountFen) throw new ApplicationError("REFUND_EXCEEDS_PAYMENT", 409, "Refund exceeds captured payment amount.");
    const provider = this.providers[payment.payment.provider as keyof PaymentProviders];
    if (!provider) throw new ApplicationError("PAYMENT_PROVIDER_NOT_SUPPORTED", 409, "Payment provider is not supported.");
    const providerResult = await provider.refund({ providerPaymentId: payment.payment.providerPaymentId, refundId: `refund:${input.idempotencyKey}`, amountFen: input.amountFen });
    const [created] = await this.database.insert(refunds).values({ paymentId: payment.payment.id, provider: payment.payment.provider, providerRefundId: providerResult.providerRefundId, status: "succeeded", amountFen: input.amountFen, reason: input.reason.trim(), idempotencyKey: input.idempotencyKey }).returning();
    if (!created) throw new ApplicationError("REFUND_CREATE_FAILED", 500, "Refund record was not created.");
    return created;
  }

  async requestInvoice(context: AuthContext, input: { orderId: string; invoiceType: string; recipient: Record<string, unknown> }) {
    const [order] = await this.database.select({ id: billingOrders.id }).from(billingOrders).where(and(eq(billingOrders.id, input.orderId), eq(billingOrders.workspaceId, context.workspaceId), eq(billingOrders.status, "paid"))).limit(1);
    if (!order) throw new ApplicationError("ORDER_NOT_INVOICEABLE", 409, "Order is not invoiceable.");
    const [created] = await this.database.insert(invoiceRequests).values({ workspaceId: context.workspaceId, userId: context.userId, orderId: order.id, invoiceType: input.invoiceType.trim(), recipient: input.recipient }).returning();
    if (!created) throw new ApplicationError("INVOICE_REQUEST_CREATE_FAILED", 500, "Invoice request was not created.");
    return created;
  }
}
