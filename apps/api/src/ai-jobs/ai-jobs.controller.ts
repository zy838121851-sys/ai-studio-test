import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AiJobDto, AiJobListDto, AiJobStatusDto } from "@ai-studio/contracts";
import { ApplicationError, type AuthContext } from "@ai-studio/server-core";

import { CurrentAuth, SessionAuthGuard } from "../auth/auth-context.js";
import { PlatformService } from "../platform.service.js";
import { CreateAiJobDto } from "./ai-jobs.dto.js";

@ApiTags("ai-jobs")
@Controller("ai-jobs")
@UseGuards(SessionAuthGuard)
export class AiJobsController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Post()
  @ApiBody({ type: CreateAiJobDto })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOperation({ summary: "Reserve credits and create a durable AI job" })
  create(
    @CurrentAuth() auth: AuthContext,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: CreateAiJobDto
  ): Promise<AiJobDto> {
    if (!idempotencyKey) {
      throw new ApplicationError("IDEMPOTENCY_KEY_REQUIRED", 400, "缺少 Idempotency-Key");
    }

    return this.platform.aiJobs.create(auth, {
      ...body,
      idempotencyKey
    });
  }

  @Get()
  @ApiOperation({ summary: "List workspace-scoped AI jobs for the task log" })
  list(
    @CurrentAuth() auth: AuthContext,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("status") status?: AiJobStatusDto,
    @Query("modelId") modelId?: string
  ): Promise<AiJobListDto> {
    const normalizedStatus = status && ["queued", "running", "succeeded", "failed", "cancelled"].includes(status) ? status : undefined;
    const normalizedModelId = modelId?.trim();
    return this.platform.aiJobs.list(auth, {
      limit: Number(limit),
      offset: Number(offset),
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
      ...(normalizedModelId ? { modelId: normalizedModelId } : {})
    });
  }

  @Get(":jobId")
  @ApiOperation({ summary: "Get one workspace-scoped AI job" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param("jobId") jobId: string
  ): Promise<AiJobDto> {
    return this.platform.aiJobs.get(auth, jobId);
  }
}
