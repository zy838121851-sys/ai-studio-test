import { and, asc, eq, lte, or } from "drizzle-orm";

import type { RewriteDatabase } from "../database/client.js";
import {
  auditEvents,
  moderationJobs,
  notificationDeliveries
} from "../database/schema.js";
import type { ComplianceProviders, NotificationChannel } from "./compliance-providers.js";

const RETRY_DELAY_MS = 30_000;

export class ComplianceService {
  constructor(
    private readonly database: RewriteDatabase,
    private readonly providers: ComplianceProviders
  ) {}

  async enqueueModeration(input: {
    workspaceId: string;
    subjectType: string;
    subjectId: string;
    contentHash: string;
    idempotencyKey: string;
  }): Promise<string> {
    const existing = await this.database.query.moderationJobs.findFirst({
      where: (table, { and, eq }) => and(eq(table.workspaceId, input.workspaceId), eq(table.idempotencyKey, input.idempotencyKey))
    });
    if (existing) return existing.id;
    const [job] = await this.database.insert(moderationJobs).values({
      ...input,
      provider: "configured",
      result: {}
    }).returning({ id: moderationJobs.id });
    if (!job) throw new Error("Moderation job was not created.");
    return job.id;
  }

  async processModeration(jobId: string): Promise<void> {
    const [job] = await this.database.select().from(moderationJobs).where(eq(moderationJobs.id, jobId));
    if (!job || ["passed", "blocked"].includes(job.status)) return;
    await this.database.update(moderationJobs).set({
      status: "running",
      attemptCount: job.attemptCount + 1,
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null
    }).where(eq(moderationJobs.id, jobId));
    try {
      const result = await this.providers.moderation.inspect(job);
      await this.database.update(moderationJobs).set({
        status: result.decision,
        provider: result.provider,
        result: result.result,
        finishedAt: new Date()
      }).where(eq(moderationJobs.id, jobId));
    } catch (error) {
      await this.database.update(moderationJobs).set({
        status: "failed",
        availableAt: new Date(Date.now() + RETRY_DELAY_MS),
        errorCode: error instanceof Error && "code" in error ? String(error.code) : "MODERATION_FAILED",
        errorMessage: error instanceof Error ? error.message : "Moderation failed"
      }).where(eq(moderationJobs.id, jobId));
      throw error;
    }
  }

  async enqueueNotification(input: {
    workspaceId: string;
    recipientUserId?: string;
    channel: NotificationChannel;
    recipient: string;
    templateKey: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<string> {
    const existing = await this.database.query.notificationDeliveries.findFirst({
      where: (table, { and, eq }) => and(eq(table.workspaceId, input.workspaceId), eq(table.idempotencyKey, input.idempotencyKey))
    });
    if (existing) return existing.id;
    const [delivery] = await this.database.insert(notificationDeliveries).values({
      ...input,
      provider: "configured"
    }).returning({ id: notificationDeliveries.id });
    if (!delivery) throw new Error("Notification delivery was not created.");
    return delivery.id;
  }

  async processNotification(deliveryId: string): Promise<void> {
    const [delivery] = await this.database.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, deliveryId));
    if (!delivery || delivery.status === "delivered") return;
    await this.database.update(notificationDeliveries).set({
      status: "running",
      attemptCount: delivery.attemptCount + 1,
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null
    }).where(eq(notificationDeliveries.id, deliveryId));
    try {
      const result = await this.providers.notification.deliver(delivery);
      await this.database.update(notificationDeliveries).set({
        status: "delivered",
        provider: result.provider,
        providerReference: result.providerReference,
        deliveredAt: new Date()
      }).where(eq(notificationDeliveries.id, deliveryId));
    } catch (error) {
      await this.database.update(notificationDeliveries).set({
        status: "failed",
        availableAt: new Date(Date.now() + RETRY_DELAY_MS),
        errorCode: error instanceof Error && "code" in error ? String(error.code) : "NOTIFICATION_FAILED",
        errorMessage: error instanceof Error ? error.message : "Notification failed"
      }).where(eq(notificationDeliveries.id, deliveryId));
      throw error;
    }
  }

  async appendAuditEvent(input: {
    workspaceId: string;
    actorUserId?: string;
    action: string;
    targetType: string;
    targetId: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const [event] = await this.database.insert(auditEvents).values({
      ...input,
      metadata: input.metadata ?? {}
    }).returning({ id: auditEvents.id });
    if (!event) throw new Error("Audit event was not created.");
    return event.id;
  }

  async listRecoverableWork(now = new Date()): Promise<{ moderationJobIds: string[]; notificationIds: string[] }> {
    const [moderation, notifications] = await Promise.all([
      this.database.select({ id: moderationJobs.id }).from(moderationJobs).where(and(or(eq(moderationJobs.status, "pending"), eq(moderationJobs.status, "failed")), lte(moderationJobs.availableAt, now))).orderBy(asc(moderationJobs.createdAt)),
      this.database.select({ id: notificationDeliveries.id }).from(notificationDeliveries).where(and(or(eq(notificationDeliveries.status, "pending"), eq(notificationDeliveries.status, "failed")), lte(notificationDeliveries.availableAt, now))).orderBy(asc(notificationDeliveries.createdAt))
    ]);
    return { moderationJobIds: moderation.map((row) => row.id), notificationIds: notifications.map((row) => row.id) };
  }
}
