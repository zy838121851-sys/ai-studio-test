import { ApplicationError } from "../application/application-error.js";

export type OrderStatus = "pending" | "paid" | "cancelled" | "expired" | "refunded";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "cancelled";
export type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled" | "expired";

export interface Money {
  currency: string;
  amountFen: number;
}

export function createMoney(currency: string, amountFen: number): Money {
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isSafeInteger(amountFen) || amountFen < 0) {
    throw new ApplicationError("INVALID_MONEY", 400, "金额必须是非负整数分，并使用大写 ISO 货币代码。");
  }
  return { currency, amountFen };
}

export function transitionOrder(status: OrderStatus, next: OrderStatus): OrderStatus {
  const allowed: Record<OrderStatus, readonly OrderStatus[]> = {
    pending: ["paid", "cancelled", "expired"],
    paid: ["refunded"],
    cancelled: [],
    expired: [],
    refunded: []
  };
  if (!allowed[status].includes(next)) {
    throw new ApplicationError("INVALID_ORDER_TRANSITION", 409, `订单不能从 ${status} 转为 ${next}。`);
  }
  return next;
}

export function transitionPayment(status: PaymentStatus, next: PaymentStatus): PaymentStatus {
  const allowed: Record<PaymentStatus, readonly PaymentStatus[]> = {
    pending: ["succeeded", "failed", "cancelled"],
    succeeded: ["refunded"],
    failed: ["pending"],
    refunded: [],
    cancelled: []
  };
  if (!allowed[status].includes(next)) {
    throw new ApplicationError("INVALID_PAYMENT_TRANSITION", 409, `支付不能从 ${status} 转为 ${next}。`);
  }
  return next;
}

export function transitionSubscription(status: SubscriptionStatus, next: SubscriptionStatus): SubscriptionStatus {
  const allowed: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
    pending: ["active", "cancelled"],
    active: ["paused", "cancelled", "expired"],
    paused: ["active", "cancelled", "expired"],
    cancelled: [],
    expired: []
  };
  if (!allowed[status].includes(next)) {
    throw new ApplicationError("INVALID_SUBSCRIPTION_TRANSITION", 409, `订阅不能从 ${status} 转为 ${next}。`);
  }
  return next;
}
