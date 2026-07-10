import type {
  CanvasDocumentDto,
  ProjectDetailDto,
  ProjectSummaryDto
} from "@ai-studio/contracts";
import { and, desc, eq } from "drizzle-orm";

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
        canvasDocument: serializeCanvasDocument(canvasDocument)
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
      assertCanvasDocument(input.canvasDocument, projectId);
      updates.canvasDocument = serializeCanvasDocument(input.canvasDocument);
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
  const document = value as unknown as CanvasDocumentDto;
  assertCanvasDocument(document, projectId);
  return document;
}

function serializeCanvasDocument(document: CanvasDocumentDto): Record<string, unknown> {
  return document as unknown as Record<string, unknown>;
}
import { randomUUID } from "node:crypto";
