import { and, eq, lte } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { entitlements, subscriptions } from "../database/schema.js";
import { ensureCancellable, evaluateSubscriptionLifecycle } from "./subscription-lifecycle.js";

export class SubscriptionService {
  constructor(private readonly database: RewriteDatabase) {}

  async list(context: AuthContext) {
    return this.database.select().from(subscriptions).where(eq(subscriptions.workspaceId, context.workspaceId));
  }

  async cancel(context: AuthContext, subscriptionId: string) {
    const [subscription] = await this.database.select().from(subscriptions).where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.workspaceId, context.workspaceId))).limit(1);
    if (!subscription) throw new ApplicationError("SUBSCRIPTION_NOT_FOUND", 404, "Subscription does not exist.");
    ensureCancellable(subscription.status);
    const [updated] = await this.database.update(subscriptions).set({ cancelAtPeriodEnd: 1, updatedAt: new Date() }).where(eq(subscriptions.id, subscription.id)).returning();
    return updated;
  }

  async advanceDue(now = new Date()): Promise<{ processed: number; renewalDueIds: string[] }> {
    const rows = await this.database.select().from(subscriptions).where(lte(subscriptions.currentPeriodEnd, now));
    const renewalDueIds: string[] = [];
    for (const subscription of rows) {
      const result = evaluateSubscriptionLifecycle({ status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd, cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd), now });
      if (result.shouldAttemptRenewal) renewalDueIds.push(subscription.id);
      if (result.status === subscription.status) continue;
      await this.database.transaction(async (transaction) => {
        await transaction.update(subscriptions).set({ status: result.status, updatedAt: now }).where(eq(subscriptions.id, subscription.id));
        await transaction.update(entitlements).set({ status: result.entitlementStatus, updatedAt: now }).where(and(eq(entitlements.sourceType, "subscription"), eq(entitlements.sourceId, subscription.id)));
      });
    }
    return { processed: rows.length, renewalDueIds };
  }
}
