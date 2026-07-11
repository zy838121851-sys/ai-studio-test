import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthContext } from "@ai-studio/server-core";
import { CurrentAuth, SessionAuthGuard } from "./auth/auth-context.js";
import { PlatformService } from "./platform.service.js";

@ApiTags("commercial")
@Controller("catalog")
export class CatalogController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}
  @Get("plans") @ApiOperation({ summary: "List active authoritative plans" }) plans() { return this.platform.catalog.listPlans(); }
  @Get("entitlements") @UseGuards(SessionAuthGuard) @ApiOperation({ summary: "List active workspace entitlements" }) entitlements(@CurrentAuth() auth: AuthContext) { return this.platform.catalog.listEntitlements(auth); }
}
