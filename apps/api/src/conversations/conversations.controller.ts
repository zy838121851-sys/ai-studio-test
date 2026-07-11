import { Controller, Get, Inject, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ConversationDto } from "@ai-studio/contracts";
import type { AuthContext } from "@ai-studio/server-core";

import { CurrentAuth, SessionAuthGuard } from "../auth/auth-context.js";
import { PlatformService } from "../platform.service.js";

@ApiTags("conversations")
@Controller("projects/:projectId/conversation")
@UseGuards(SessionAuthGuard)
export class ConversationsController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Get()
  @ApiOperation({ summary: "Restore the current workspace conversation for a project" })
  get(
    @CurrentAuth() auth: AuthContext,
    @Param("projectId") projectId: string
  ): Promise<ConversationDto> {
    return this.platform.conversations.getProjectConversation(auth, projectId);
  }
}
