import { describe, expect, it } from "vitest";

import { evaluateSubscriptionLifecycle, SUBSCRIPTION_GRACE_PERIOD_MS } from "./subscription-lifecycle.js";

describe("subscription lifecycle", () => {
  const now = new Date("2026-07-11T00:00:00Z");
  it("keeps an active subscription available and schedules its renewal reminder", () => {
    expect(evaluateSubscriptionLifecycle({ status: "active", currentPeriodEnd: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1_000), cancelAtPeriodEnd: false, now })).toMatchObject({ status: "active", entitlementStatus: "active", shouldSendExpiryReminder: true });
  });
  it("uses grace before expiry and honors accessible cancellation", () => {
    expect(evaluateSubscriptionLifecycle({ status: "active", currentPeriodEnd: new Date(now.getTime() - 1), cancelAtPeriodEnd: false, now })).toMatchObject({ status: "paused", entitlementStatus: "active", shouldAttemptRenewal: true });
    expect(evaluateSubscriptionLifecycle({ status: "active", currentPeriodEnd: new Date(now.getTime() - 1), cancelAtPeriodEnd: true, now })).toMatchObject({ status: "cancelled", entitlementStatus: "expired" });
    expect(evaluateSubscriptionLifecycle({ status: "paused", currentPeriodEnd: new Date(now.getTime() - SUBSCRIPTION_GRACE_PERIOD_MS - 1), cancelAtPeriodEnd: false, now })).toMatchObject({ status: "expired", entitlementStatus: "expired" });
  });
});
