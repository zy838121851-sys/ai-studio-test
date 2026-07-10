import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
  CanvasDocumentDto,
  ProjectDetailDto,
  ProjectSummaryDto
} from "@ai-studio/contracts";
import type { AuthContext } from "@ai-studio/server-core";

import { CurrentAuth, SessionAuthGuard } from "../auth/auth-context.js";
import { PlatformService } from "../platform.service.js";
import { CreateProjectDto, UpdateProjectDto } from "./projects.dto.js";

@ApiTags("projects")
@Controller("projects")
@UseGuards(SessionAuthGuard)
export class ProjectsController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Post()
  @ApiBody({ type: CreateProjectDto })
  @ApiOperation({ summary: "Create a project in the current workspace" })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body() body: CreateProjectDto
  ): Promise<ProjectDetailDto> {
    return this.platform.projects.create(auth, body);
  }

  @Get("recent")
  @ApiOperation({ summary: "List recent projects in the current workspace" })
  listRecent(
    @CurrentAuth() auth: AuthContext,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 12
  ): Promise<ProjectSummaryDto[]> {
    return this.platform.projects.listRecent(auth, limit);
  }

  @Get(":projectId")
  @ApiOperation({ summary: "Get one workspace-scoped project" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param("projectId") projectId: string
  ): Promise<ProjectDetailDto> {
    return this.platform.projects.get(auth, projectId);
  }

  @Patch(":projectId")
  @ApiBody({ type: UpdateProjectDto })
  @ApiOperation({ summary: "Update a versioned project document" })
  update(
    @CurrentAuth() auth: AuthContext,
    @Param("projectId") projectId: string,
    @Body() body: UpdateProjectDto
  ): Promise<ProjectDetailDto> {
    return this.platform.projects.update(auth, projectId, {
      expectedVersion: body.expectedVersion,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.canvasDocument !== undefined
        ? { canvasDocument: body.canvasDocument as unknown as CanvasDocumentDto }
        : {})
    });
  }
}
