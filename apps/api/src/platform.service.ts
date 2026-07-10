import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import {
  loadRewriteConfig,
  RewriteInfrastructure,
  type ReadinessResult,
  type RewriteConfig
} from "@ai-studio/server-core";

@Injectable()
export class PlatformService implements OnApplicationShutdown {
  readonly config: RewriteConfig;
  readonly infrastructure: RewriteInfrastructure;

  constructor() {
    this.config = loadRewriteConfig(process.env);
    this.infrastructure = new RewriteInfrastructure(this.config);
  }

  checkReadiness(): Promise<ReadinessResult> {
    return this.infrastructure.checkReadiness();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.infrastructure.close();
  }
}
