import { createHash, randomUUID } from "node:crypto";

import {
  fitCanvasNodeSize,
  normalizeCanvasDocument,
  replaceImageTransformResult
} from "@ai-studio/canvas-engine";
import type { AiJobDto } from "@ai-studio/contracts";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import {
  aiJobs,
  creditAccounts,
  creditLedger,
  outboxEvents,
  projects,
  uploads
} from "../database/schema.js";
import { findModel, quoteModel } from "../models/model-catalog.js";
import type { StorageProvider } from "../storage/storage-provider.js";

export interface CreateAiJobInput {
  projectId: string;
  modelId: string;
  prompt: string;
  uploadIds: string[];
  idempotencyKey: string;
  transformSourceNodeId?: string;
  transformKind?: "crop" | "upscale" | "remove-background" | "expand" | "edit-text";
}

export interface PendingOutboxEvent {
  id: string;
  jobId: string;
}

type AiJobRow = typeof aiJobs.$inferSelect;

export class AiJobService {
  constructor(
    private readonly database: RewriteDatabase,
    private readonly storage: StorageProvider
  ) {}

  async create(context: AuthContext, input: CreateAiJobInput): Promise<AiJobDto> {
    const model = findModel(input.modelId);
    if (model.modality !== "image") {
      throw new ApplicationError(
        "HOME_MODEL_NOT_SUPPORTED",
        400,
        "当前首页纵向切片仅承接图像生成"
      );
    }
    const prompt = normalizePrompt(input.prompt);
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const uploadIds = [...new Set(input.uploadIds)].slice(0, 8);
    const quote = quoteModel(model.id, 1);
    const jobId = randomUUID();
    const pendingNodeId = randomUUID();

    const job = await this.database.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(aiJobs)
        .where(
          and(
            eq(aiJobs.workspaceId, context.workspaceId),
            eq(aiJobs.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      if (existing) {
        return existing;
      }

      const [project] = await transaction
        .select({ id: projects.id, version: projects.version })
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.workspaceId, context.workspaceId))
        )
        .limit(1);
      if (!project) {
        throw new ApplicationError("PROJECT_NOT_FOUND", 404, "项目不存在");
      }

      if (uploadIds.length > 0) {
        const ownedUploads = await transaction
          .select({ id: uploads.id })
          .from(uploads)
          .where(
            and(eq(uploads.workspaceId, context.workspaceId), inArray(uploads.id, uploadIds))
          );
        if (ownedUploads.length !== uploadIds.length) {
          throw new ApplicationError("UPLOAD_NOT_FOUND", 404, "参考图不存在或无权访问");
        }
      }

      const [account] = await transaction
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.workspaceId, context.workspaceId))
        .for("update")
        .limit(1);
      if (!account) {
        throw new ApplicationError("CREDIT_ACCOUNT_NOT_FOUND", 500, "积分账户不存在");
      }
      if (account.balance - account.reserved < quote.totalCredits) {
        throw new ApplicationError("INSUFFICIENT_CREDITS", 402, "可用积分不足");
      }

      const nextReserved = account.reserved + quote.totalCredits;
      await transaction
        .update(creditAccounts)
        .set({ reserved: nextReserved, version: account.version + 1, updatedAt: new Date() })
        .where(eq(creditAccounts.id, account.id));
      await transaction.insert(creditLedger).values({
        workspaceId: context.workspaceId,
        entryType: "reserve",
        amount: 0,
        reservedDelta: quote.totalCredits,
        balanceAfter: account.balance,
        reservedAfter: nextReserved,
        idempotencyKey: `job:${jobId}:reserve`,
        referenceType: "ai_job",
        referenceId: jobId,
        metadata: { modelId: model.id }
      });

      const [created] = await transaction
        .insert(aiJobs)
        .values({
          id: jobId,
          workspaceId: context.workspaceId,
          projectId: project.id,
          createdByUserId: context.userId,
          modelId: model.id,
          input: {
            prompt,
            uploadIds,
            ...(input.transformSourceNodeId ? { transformSourceNodeId: input.transformSourceNodeId } : {}),
            ...(input.transformKind ? { transformKind: input.transformKind } : {})
          },
          reservedCredits: quote.totalCredits,
          idempotencyKey
        })
        .returning();
      if (!created) {
        throw new ApplicationError("AI_JOB_CREATE_FAILED", 500, "生成任务创建失败");
      }

      await transaction
        .update(projects)
        .set({
          canvasDocument: {
            schemaVersion: 1,
            projectId: project.id,
            nodes: [
              {
                id: pendingNodeId,
                kind: "pending-image",
                jobId,
                x: 120,
                y: 100,
                width: 640,
                height: 640
              }
            ]
          },
          version: project.version + 1,
          updatedAt: new Date()
        })
        .where(eq(projects.id, project.id));
      await transaction.insert(outboxEvents).values({
        aggregateType: "ai_job",
        aggregateId: jobId,
        eventType: "ai_job.created",
        payload: { jobId, workspaceId: context.workspaceId }
      });

      return created;
    });

    return toAiJobDto(job);
  }

  async get(context: AuthContext, jobId: string): Promise<AiJobDto> {
    const [job] = await this.database
      .select()
      .from(aiJobs)
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.workspaceId, context.workspaceId)))
      .limit(1);
    if (!job) {
      throw new ApplicationError("AI_JOB_NOT_FOUND", 404, "生成任务不存在");
    }

    return toAiJobDto(job);
  }

  async listPendingOutbox(limit = 100): Promise<PendingOutboxEvent[]> {
    const rows = await this.database
      .select({ id: outboxEvents.id, jobId: outboxEvents.aggregateId })
      .from(outboxEvents)
      .where(
        and(
          eq(outboxEvents.status, "pending"),
          eq(outboxEvents.aggregateType, "ai_job"),
          eq(outboxEvents.eventType, "ai_job.created")
        )
      )
      .orderBy(asc(outboxEvents.createdAt))
      .limit(Math.min(Math.max(limit, 1), 500));

    return rows;
  }

  async markOutboxPublished(eventId: string): Promise<void> {
    await this.database
      .update(outboxEvents)
      .set({ status: "published", publishedAt: new Date() })
      .where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, "pending")));
  }

  async markRunning(jobId: string): Promise<AiJobDto | null> {
    const [job] = await this.database
      .update(aiJobs)
      .set({
        status: "running",
        startedAt: new Date(),
        attemptCount: sql`${aiJobs.attemptCount} + 1`,
        updatedAt: new Date()
      })
      .where(and(eq(aiJobs.id, jobId), inArray(aiJobs.status, ["queued", "running"])))
      .returning();

    if (job) {
      return toAiJobDto(job);
    }

    const [existing] = await this.database.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
    return existing ? toAiJobDto(existing) : null;
  }

  async getWorkerInput(jobId: string): Promise<{
    id: string;
    workspaceId: string;
    projectId: string;
    prompt: string;
    modelId: string;
    status: AiJobRow["status"];
    references: { contentType: string; body: Buffer }[];
    transformKind: "crop" | "upscale" | "remove-background" | "expand" | "edit-text" | null;
    transformSourceNodeId: string | null;
  }> {
    const [job] = await this.database.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
    if (!job) {
      throw new ApplicationError("AI_JOB_NOT_FOUND", 404, "生成任务不存在");
    }
    const input = parseJobInput(job.input);
    const referenceRows =
      input.uploadIds.length > 0
        ? await this.database
            .select({ contentType: uploads.contentType, storageKey: uploads.storageKey })
            .from(uploads)
            .where(
              and(
                eq(uploads.workspaceId, job.workspaceId),
                inArray(uploads.id, input.uploadIds)
              )
            )
        : [];
    const references = await Promise.all(
      referenceRows.map(async (reference) => ({
        contentType: reference.contentType,
        body: await this.storage.get(reference.storageKey)
      }))
    );

    return {
      id: job.id,
      workspaceId: job.workspaceId,
      projectId: job.projectId,
      prompt: input.prompt,
      modelId: job.modelId,
      status: job.status,
      references,
      transformKind: input.transformKind,
      transformSourceNodeId: input.transformSourceNodeId
    };
  }

  async listRecoverableJobIds(limit = 100): Promise<string[]> {
    const rows = await this.database
      .select({ id: aiJobs.id })
      .from(aiJobs)
      .where(inArray(aiJobs.status, ["queued", "running"]))
      .orderBy(asc(aiJobs.updatedAt))
      .limit(Math.min(Math.max(limit, 1), 500));
    return rows.map((row) => row.id);
  }

  async completeWithImage(
    jobId: string,
    result: { body: Buffer; contentType: string; width: number; height: number }
  ): Promise<AiJobDto> {
    const [existing] = await this.database.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
    if (!existing) {
      throw new ApplicationError("AI_JOB_NOT_FOUND", 404, "生成任务不存在");
    }
    if (existing.status === "succeeded") {
      return toAiJobDto(existing);
    }

    const extension = result.contentType === "image/svg+xml" ? ".svg" : ".png";
    const storageKey = `${existing.workspaceId}/results/${existing.id}${extension}`;
    let createdStorageObject = false;
    if (!(await this.storage.exists(storageKey))) {
      await this.storage.put({ key: storageKey, body: result.body, contentType: result.contentType });
      createdStorageObject = true;
    }

    try {
      const completed = await this.database.transaction(async (transaction) => {
        const [job] = await transaction
          .select()
          .from(aiJobs)
          .where(eq(aiJobs.id, jobId))
          .for("update")
          .limit(1);
        if (!job) {
          throw new ApplicationError("AI_JOB_NOT_FOUND", 404, "生成任务不存在");
        }
        if (job.status === "succeeded") {
          return job;
        }
        if (job.status === "failed" || job.status === "cancelled") {
          throw new ApplicationError("AI_JOB_TERMINAL", 409, "任务已结束，不能再次完成");
        }

        const checksumSha256 = createHash("sha256").update(result.body).digest("hex");
        const [existingUpload] = await transaction
          .select()
          .from(uploads)
          .where(
            and(
              eq(uploads.storageProvider, this.storage.name),
              eq(uploads.storageKey, storageKey)
            )
          )
          .limit(1);
        const upload =
          existingUpload ??
          (
            await transaction
              .insert(uploads)
              .values({
                workspaceId: job.workspaceId,
                storageProvider: this.storage.name,
                storageKey,
                originalName: `generated-${job.id}${extension}`,
                contentType: result.contentType,
                byteSize: result.body.byteLength,
                checksumSha256
              })
              .returning()
          )[0];
        if (!upload) {
          throw new ApplicationError("AI_RESULT_REGISTER_FAILED", 500, "生成结果保存失败");
        }

        const [account] = await transaction
          .select()
          .from(creditAccounts)
          .where(eq(creditAccounts.workspaceId, job.workspaceId))
          .for("update")
          .limit(1);
        if (!account || account.reserved < job.reservedCredits) {
          throw new ApplicationError("CREDIT_INVARIANT_FAILED", 500, "积分预留状态异常");
        }

        const nextBalance = account.balance - job.reservedCredits;
        const nextReserved = account.reserved - job.reservedCredits;
        await transaction
          .update(creditAccounts)
          .set({
            balance: nextBalance,
            reserved: nextReserved,
            version: account.version + 1,
            updatedAt: new Date()
          })
          .where(eq(creditAccounts.id, account.id));
        await transaction.insert(creditLedger).values({
          workspaceId: job.workspaceId,
          entryType: "charge",
          amount: -job.reservedCredits,
          reservedDelta: -job.reservedCredits,
          balanceAfter: nextBalance,
          reservedAfter: nextReserved,
          idempotencyKey: `job:${job.id}:charge`,
          referenceType: "ai_job",
          referenceId: job.id,
          metadata: { modelId: job.modelId }
        });

        const output = {
          uploadId: upload.id,
          url: `/api/v1/uploads/${upload.id}/content`,
          width: result.width,
          height: result.height
        };
        const canvasNodeSize = fitCanvasNodeSize(result.width, result.height);
        const [updatedJob] = await transaction
          .update(aiJobs)
          .set({
            status: "succeeded",
            output,
            chargedCredits: job.reservedCredits,
            finishedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(aiJobs.id, job.id))
          .returning();
        if (!updatedJob) {
          throw new ApplicationError("AI_JOB_COMPLETE_FAILED", 500, "任务完成状态保存失败");
        }

        const [project] = await transaction
          .select({ version: projects.version, canvasDocument: projects.canvasDocument })
          .from(projects)
          .where(eq(projects.id, job.projectId))
          .for("update")
          .limit(1);
        if (project) {
          const sourceNodeId = parseJobInput(job.input).transformSourceNodeId;
          if (sourceNodeId) {
            const canvasDocument = replaceImageTransformResult(
              normalizeCanvasDocument(project.canvasDocument, job.projectId),
              sourceNodeId,
              { sourceUrl: output.url, alt: "Generated image" }
            );
            await transaction
              .update(projects)
              .set({
                thumbnailStorageKey: storageKey,
                canvasDocument: canvasDocument as unknown as Record<string, unknown>,
                version: project.version + 1,
                updatedAt: new Date()
              })
              .where(eq(projects.id, job.projectId));
            return updatedJob;
          }
          await transaction
            .update(projects)
            .set({
              thumbnailStorageKey: storageKey,
              canvasDocument: {
                schemaVersion: 1,
                projectId: job.projectId,
                nodes: [
                  {
                    id: `result-${job.id}`,
                    kind: "image",
                    sourceUrl: output.url,
                    alt: "生成图片",
                    x: 120,
                    y: 100,
                    width: canvasNodeSize.width,
                    height: canvasNodeSize.height
                  }
                ]
              },
              version: project.version + 1,
              updatedAt: new Date()
            })
            .where(eq(projects.id, job.projectId));
        }

        return updatedJob;
      });

      return toAiJobDto(completed);
    } catch (error) {
      if (createdStorageObject) {
        await this.storage.delete(storageKey);
      }
      throw error;
    }
  }

  async fail(jobId: string, code: string, message: string): Promise<AiJobDto> {
    const failed = await this.database.transaction(async (transaction) => {
      const [job] = await transaction
        .select()
        .from(aiJobs)
        .where(eq(aiJobs.id, jobId))
        .for("update")
        .limit(1);
      if (!job) {
        throw new ApplicationError("AI_JOB_NOT_FOUND", 404, "生成任务不存在");
      }
      if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
        return job;
      }

      const [account] = await transaction
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.workspaceId, job.workspaceId))
        .for("update")
        .limit(1);
      if (!account || account.reserved < job.reservedCredits) {
        throw new ApplicationError("CREDIT_INVARIANT_FAILED", 500, "积分预留状态异常");
      }

      const nextReserved = account.reserved - job.reservedCredits;
      await transaction
        .update(creditAccounts)
        .set({ reserved: nextReserved, version: account.version + 1, updatedAt: new Date() })
        .where(eq(creditAccounts.id, account.id));
      await transaction.insert(creditLedger).values({
        workspaceId: job.workspaceId,
        entryType: "release",
        amount: 0,
        reservedDelta: -job.reservedCredits,
        balanceAfter: account.balance,
        reservedAfter: nextReserved,
        idempotencyKey: `job:${job.id}:release`,
        referenceType: "ai_job",
        referenceId: job.id,
        metadata: { errorCode: code }
      });

      const [updated] = await transaction
        .update(aiJobs)
        .set({
          status: "failed",
          errorCode: code.slice(0, 100),
          errorMessage: message.slice(0, 1_000),
          finishedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(aiJobs.id, job.id))
        .returning();
      if (!updated) {
        throw new ApplicationError("AI_JOB_FAIL_UPDATE_FAILED", 500, "任务失败状态保存失败");
      }
      return updated;
    });

    return toAiJobDto(failed);
  }
}

function normalizePrompt(prompt: string): string {
  const normalized = prompt.trim();
  if (!normalized || normalized.length > 8_000) {
    throw new ApplicationError("INVALID_PROMPT", 400, "请输入 1 到 8000 个字符的创作描述");
  }
  return normalized;
}

function normalizeIdempotencyKey(key: string): string {
  const normalized = key.trim();
  if (normalized.length < 8 || normalized.length > 160) {
    throw new ApplicationError("INVALID_IDEMPOTENCY_KEY", 400, "幂等键格式不正确");
  }
  return normalized;
}

function parseJobInput(value: Record<string, unknown>): {
  prompt: string;
  uploadIds: string[];
  transformSourceNodeId: string | null;
  transformKind: "crop" | "upscale" | "remove-background" | "expand" | "edit-text" | null;
} {
  return {
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    uploadIds: Array.isArray(value.uploadIds)
      ? value.uploadIds.filter((item): item is string => typeof item === "string")
      : [],
    transformSourceNodeId:
      typeof value.transformSourceNodeId === "string" ? value.transformSourceNodeId : null,
    transformKind:
      value.transformKind === "crop" ||
      value.transformKind === "upscale" ||
      value.transformKind === "remove-background" ||
      value.transformKind === "expand" ||
      value.transformKind === "edit-text"
        ? value.transformKind
        : null
  };
}

function toAiJobDto(job: AiJobRow): AiJobDto {
  const input = parseJobInput(job.input);
  const output = parseJobOutput(job.output);
  return {
    id: job.id,
    projectId: job.projectId,
    modelId: job.modelId,
    status: job.status,
    prompt: input.prompt,
    reservedCredits: job.reservedCredits,
    chargedCredits: job.chargedCredits,
    output,
    error:
      job.errorCode && job.errorMessage
        ? { code: job.errorCode, message: job.errorMessage }
        : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

function parseJobOutput(value: Record<string, unknown> | null): AiJobDto["output"] {
  if (
    !value ||
    typeof value.uploadId !== "string" ||
    typeof value.url !== "string" ||
    typeof value.width !== "number" ||
    typeof value.height !== "number"
  ) {
    return null;
  }

  return {
    uploadId: value.uploadId,
    url: value.url,
    width: value.width,
    height: value.height
  };
}
