import { Controller, Get } from "@nestjs/common";

export interface HealthResponse {
  service: "ai-studio-rewrite-api";
  status: "ok";
}

@Controller("api/v1/health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      service: "ai-studio-rewrite-api",
      status: "ok"
    };
  }
}
