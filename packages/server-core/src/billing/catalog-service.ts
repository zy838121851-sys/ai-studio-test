import { and, asc, eq, gt, isNull, or } from "drizzle-orm";

import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { entitlements, plans, prices } from "../database/schema.js";

export class CatalogService {
  constructor(private readonly database: RewriteDatabase) {}

  async listPlans() {
    const rows = await this.database
      .select({ planId: plans.id, code: plans.code, name: plans.name, description: plans.description, priceId: prices.id, priceCode: prices.code, currency: prices.currency, amountFen: prices.amountFen, credits: prices.credits, interval: prices.interval })
      .from(plans)
      .innerJoin(prices, eq(prices.planId, plans.id))
      .where(and(eq(plans.active, 1), eq(prices.active, 1)))
      .orderBy(asc(prices.amountFen));
    return rows;
  }

  async listEntitlements(context: AuthContext, now = new Date()) {
    const rows = await this.database.select().from(entitlements).where(and(eq(entitlements.workspaceId, context.workspaceId), eq(entitlements.status, "active"), or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now))));
    return rows.map((row) => ({ key: row.entitlementKey, quantity: row.quantity, startsAt: row.startsAt.toISOString(), expiresAt: row.expiresAt?.toISOString() ?? null }));
  }
}
