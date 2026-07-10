import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ServiceHealth } from "@ai-studio/contracts";

import { PlatformService } from "./platform.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(@Inject(PlatformService) private readonly platform: PlatformService) {}

  @Get()
  @ApiOperation({ summary: "Report process liveness" })
  getHealth(): ServiceHealth {
    return {
      service: "ai-studio-rewrite-api",
      status: "ok"
    };
  }

  @Get("live")
  @ApiOperation({ summary: "Report process liveness" })
  getLiveness(): ServiceHealth {
    return this.getHealth();
  }

  @Get("ready")
  @ApiOperation({ summary: "Report infrastructure readiness" })
  async getReadiness(): Promise<ServiceHealth> {
    const readiness = await this.platform.checkReadiness();
    const response: ServiceHealth = {
      service: "ai-studio-rewrite-api",
      status: readiness.ready ? "ok" : "degraded",
      dependencies: readiness.dependencies
    };

    if (!readiness.ready) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
