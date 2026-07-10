import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CapabilityRegistryDto } from "@ai-studio/contracts";

import { PlatformService } from "./platform.service.js";

@ApiTags("capabilities")
@Controller("capabilities")
export class CapabilitiesController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Get()
  @ApiOperation({ summary: "List external capability readiness without provider credentials" })
  getCapabilities(): CapabilityRegistryDto {
    return this.platform.capabilities.toDto();
  }
}
