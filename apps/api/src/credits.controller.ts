import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CreditBalanceDto } from "@ai-studio/contracts";
import type { AuthContext } from "@ai-studio/server-core";

import { CurrentAuth, SessionAuthGuard } from "./auth/auth-context.js";
import { PlatformService } from "./platform.service.js";

@ApiTags("credits")
@Controller("credits")
@UseGuards(SessionAuthGuard)
export class CreditsController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Get("balance")
  @ApiOperation({ summary: "Return the authoritative workspace credit balance" })
  getBalance(@CurrentAuth() auth: AuthContext): Promise<CreditBalanceDto> {
    return this.platform.credits.getBalance(auth);
  }
}
