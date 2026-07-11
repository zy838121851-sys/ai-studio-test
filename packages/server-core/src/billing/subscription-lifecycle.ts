import { ApplicationError } from "../application/application-error.js";
import type { SubscriptionStatus } from "./billing-domain.js";

export const SUBSCRIPTION_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1_000;
export const SUBSCRIPTION_REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

export interface SubscriptionLifecycleInput {
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  now: Date;
}

export interface SubscriptionLifecycleResult {
  status: SubscriptionStatus;
  entitlementStatus: "active" | "expired";
  shouldAttemptRenewal: boolean;
  shouldSendExpiryReminder: boolean;
}

export function evaluateSubscriptionLifecycle(input: SubscriptionLifecycleInput): SubscriptionLifecycleResult {
  if (input.status === "cancelled" || input.status === "expired") {
    return { status: input.status, entitlementStatus: "expired", shouldAttemptRenewal: false, shouldSendExpiryReminder: false };
  }
  if (!input.currentPeriodEnd) {
    return { status: input.status, entitlementStatus: input.status === "active" ? "active" : "expired", shouldAttemptRenewal: false, shouldSendExpiryReminder: false };
  }
  const remaining = input.currentPeriodEnd.getTime() - input.now.getTime();
  if (remaining > 0) {
    return { status: input.status, entitlementStatus: "active", shouldAttemptRenewal: false, shouldSendExpiryReminder: !input.cancelAtPeriodEnd && remaining <= SUBSCRIPTION_REMINDER_WINDOW_MS };
  }
  if (input.cancelAtPeriodEnd) {
    return { status: "cancelled", entitlementStatus: "expired", shouldAttemptRenewal: false, shouldSendExpiryReminder: false };
  }
  if (input.now.getTime() <= input.currentPeriodEnd.getTime() + SUBSCRIPTION_GRACE_PERIOD_MS) {
    return { status: "paused", entitlementStatus: "active", shouldAttemptRenewal: true, shouldSendExpiryReminder: false };
  }
  return { status: "expired", entitlementStatus: "expired", shouldAttemptRenewal: false, shouldSendExpiryReminder: false };
}

export function ensureCancellable(status: SubscriptionStatus): void {
  if (status !== "active" && status !== "paused" && status !== "pending") {
    throw new ApplicationError("SUBSCRIPTION_NOT_CANCELLABLE", 409, "Subscription cannot be cancelled in its current state.");
  }
}
