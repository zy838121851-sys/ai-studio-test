import type {
  CanvasDocumentDto,
  ProjectDetailDto,
  ProjectSummaryDto
} from "@ai-studio/contracts";
import { migrateCanvasSnapshot, normalizeCanvasDocument, serializeCanvasDocument } from "@ai-studio/canvas-engine";
import { and, desc, eq, sql } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { projects, uploads } from "../database/schema.js";

export interface CreateProjectInput {
  title: string;
  prompt: string;
}

export interface UpdateProjectInput {
  title?: string;
  canvasDocument?: CanvasDocumentDto;
  expectedVersion: number;
}

type ProjectRow = typeof projects.$inferSelect;

export class ProjectService {
  constructor(private readonly database: RewriteDatabase) {}

  async create(context: AuthContext, input: CreateProjectInput): Promise<ProjectDetailDto> {
    const title = normalizeTitle(input.title);
    const prompt = input.prompt.trim().slice(0, 8_000);
    const projectId = randomUUID();
    const canvasDocument: CanvasDocumentDto = {
      schemaVersion: 1,
      projectId,
      nodes: []
    };
    const [project] = await this.database
      .insert(projects)
      .values({
        id: projectId,
        workspaceId: context.workspaceId,
        title,
        prompt,
        canvasDocument: serializeProjectCanvasDocument(canvasDocument, projectId)
      })
      .returning();
    if (!project) {
      throw new ApplicationError("PROJECT_CREATE_FAILED", 500, "项目创建失败");
    }

    return this.toDetail(project);
  }

  async listRecent(context: AuthContext, limit = 12): Promise<ProjectSummaryDto[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const rows = await this.database
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, context.workspaceId))
      .orderBy(desc(projects.updatedAt))
      .limit(safeLimit);

    return Promise.all(rows.map((row) => this.toSummary(row)));
  }

  async list(context: AuthContext, limit = 20, offset = 0): Promise<{
    projects: ProjectSummaryDto[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 20;
    const safeOffset = Number.isFinite(offset) ? Math.max(Math.trunc(offset), 0) : 0;
    const where = eq(projects.workspaceId, context.workspaceId);
    const [rows, count] = await Promise.all([
      this.database.select().from(projects).where(where).orderBy(desc(projects.updatedAt)).limit(safeLimit).offset(safeOffset),
      this.database.select({ count: sql<number>`count(*)::int` }).from(projects).where(where)
    ]);
    const total = count[0]?.count ?? 0;
    return { projects: await Promise.all(rows.map((row) => this.toSummary(row))), total, limit: safeLimit, offset: safeOffset, hasMore: safeOffset + rows.length < total };
  }

  async get(context: AuthContext, projectId: string): Promise<ProjectDetailDto> {
    const [project] = await this.database
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, context.workspaceId)))
      .limit(1);
    if (!project) {
      throw new ApplicationError("PROJECT_NOT_FOUND", 404, "项目不存在");
    }

    return this.toDetail(project);
  }

  async update(
    context: AuthContext,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<ProjectDetailDto> {
    const updates: Partial<typeof projects.$inferInsert> = {
      version: input.expectedVersion + 1,
      updatedAt: new Date()
    };
    if (input.title !== undefined) {
      updates.title = normalizeTitle(input.title);
    }
    if (input.canvasDocument !== undefined) {
      updates.canvasDocument = serializeProjectCanvasDocument(input.canvasDocument, projectId);
    }

    const [project] = await this.database
      .update(projects)
      .set(updates)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.workspaceId, context.workspaceId),
          eq(projects.version, input.expectedVersion)
        )
      )
      .returning();
    if (!project) {
      throw new ApplicationError(
        "PROJECT_VERSION_CONFLICT",
        409,
        "项目已在其他位置更新，请刷新后重试"
      );
    }

    return this.toDetail(project);
  }

  async remove(context: AuthContext, projectId: string): Promise<{ deleted: true }> {
    const [deleted] = await this.database
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, context.workspaceId)))
      .returning({ id: projects.id });
    if (!deleted) throw new ApplicationError("PROJECT_NOT_FOUND", 404, "Project not found.");
    return { deleted: true };
  }

  private async toSummary(row: ProjectRow): Promise<ProjectSummaryDto> {
    const [thumbnail] = row.thumbnailStorageKey
      ? await this.database
          .select({ id: uploads.id })
          .from(uploads)
          .where(
            and(
              eq(uploads.workspaceId, row.workspaceId),
              eq(uploads.storageKey, row.thumbnailStorageKey)
            )
          )
          .limit(1)
      : [];

    return {
      id: row.id,
      title: row.title,
      prompt: row.prompt,
      thumbnailUrl: thumbnail ? `/api/v1/uploads/${thumbnail.id}/content` : null,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  private async toDetail(row: ProjectRow): Promise<ProjectDetailDto> {
    return {
      ...(await this.toSummary(row)),
      canvasDocument: parseCanvasDocument(row.canvasDocument, row.id)
    };
  }
}

function normalizeTitle(title: string): string {
  const normalized = title.trim() || "未命名项目";
  if (normalized.length > 160) {
    throw new ApplicationError("INVALID_PROJECT_TITLE", 400, "项目名称不能超过 160 个字符");
  }
  return normalized;
}

function assertCanvasDocument(document: CanvasDocumentDto, projectId: string): void {
  if (document.schemaVersion !== 1 || document.projectId !== projectId || !Array.isArray(document.nodes)) {
    throw new ApplicationError("INVALID_CANVAS_DOCUMENT", 400, "画布文档格式不正确");
  }
}

function parseCanvasDocument(value: Record<string, unknown>, projectId: string): CanvasDocumentDto {
  const migrated = migrateCanvasSnapshot(value, projectId);
  const document = normalizeCanvasDocument(migrated, projectId);
  if (!document.nodes.length && hasUnrecognizedNodes(migrated)) {
    throw new ApplicationError("CANVAS_SNAPSHOT_UNSUPPORTED", 409, "Canvas snapshot cannot be restored safely.");
  }
  return document as unknown as CanvasDocumentDto;
}

function serializeProjectCanvasDocument(document: CanvasDocumentDto, projectId: string): Record<string, unknown> {
  assertCanvasDocument(document, projectId);
  return serializeCanvasDocument(normalizeCanvasDocument(document, projectId)) as unknown as Record<string, unknown>;
}

function hasUnrecognizedNodes(value: unknown): boolean {
  if (!value || typeof value !== "object" || !("nodes" in value)) return false;
  const nodes = (value as { nodes?: unknown }).nodes;
  return Array.isArray(nodes) && nodes.length > 0;
}
import { randomUUID } from "node:crypto";
