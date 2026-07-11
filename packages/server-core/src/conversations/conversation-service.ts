import { randomUUID } from "node:crypto";

import type { AiJobDto, ConversationDto, ConversationMessageDto } from "@ai-studio/contracts";
import { and, asc, eq, inArray } from "drizzle-orm";

import { ApplicationError } from "../application/application-error.js";
import type { AuthContext } from "../application/auth-context.js";
import type { RewriteDatabase } from "../database/client.js";
import { aiJobs, conversationMessages, conversations, projects } from "../database/schema.js";
import { toAiJobDto } from "../jobs/ai-job-service.js";

export class ConversationService {
  constructor(private readonly database: RewriteDatabase) {}

  async getProjectConversation(context: AuthContext, projectId: string): Promise<ConversationDto> {
    const [project] = await this.database
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.workspaceId, context.workspaceId)))
      .limit(1);
    if (!project) throw new ApplicationError("PROJECT_NOT_FOUND", 404, "项目不存在");

    const conversation = await ensureProjectConversation(
      this.database,
      context.workspaceId,
      project.id,
      context.userId
    );
    const messages = await this.database
      .select()
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.workspaceId, context.workspaceId),
          eq(conversationMessages.conversationId, conversation.id)
        )
      )
      .orderBy(asc(conversationMessages.createdAt));
    const jobIds = messages.flatMap((message) => (message.jobId ? [message.jobId] : []));
    const jobs = jobIds.length
      ? await this.database
          .select()
          .from(aiJobs)
          .where(and(eq(aiJobs.workspaceId, context.workspaceId), inArray(aiJobs.id, jobIds)))
      : [];
    const jobsById = new Map(jobs.map((job) => [job.id, toAiJobDto(job)]));

    return {
      id: conversation.id,
      projectId: conversation.projectId,
      messages: messages.map((message) => toMessageDto(message, jobsById.get(message.jobId ?? "") ?? null)),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString()
    };
  }
}

type ConversationExecutor = Pick<RewriteDatabase, "insert" | "select">;

export async function ensureProjectConversation(
  database: ConversationExecutor,
  workspaceId: string,
  projectId: string,
  userId: string
) {
  const [existing] = await database
    .select()
    .from(conversations)
    .where(and(eq(conversations.workspaceId, workspaceId), eq(conversations.projectId, projectId)))
    .limit(1);
  if (existing) return existing;

  await database
    .insert(conversations)
    .values({ id: randomUUID(), workspaceId, projectId, createdByUserId: userId })
    .onConflictDoNothing();
  const [created] = await database
    .select()
    .from(conversations)
    .where(and(eq(conversations.workspaceId, workspaceId), eq(conversations.projectId, projectId)))
    .limit(1);
  if (!created) throw new ApplicationError("CONVERSATION_CREATE_FAILED", 500, "无法创建会话");
  return created;
}

export function toMessageDto(
  message: typeof conversationMessages.$inferSelect,
  job: AiJobDto | null
): ConversationMessageDto {
  return {
    id: message.id,
    role: message.role,
    status: message.status,
    content: message.content,
    attachmentUploadIds: message.attachmentUploadIds,
    job,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString()
  };
}
