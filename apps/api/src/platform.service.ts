import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import {
  AiJobService,
  CreditService,
  IdentityService,
  loadRewriteConfig,
  ProjectService,
  RewriteInfrastructure,
  type ReadinessResult,
  type RewriteConfig,
  UploadService
} from "@ai-studio/server-core";

@Injectable()
export class PlatformService implements OnApplicationShutdown {
  readonly config: RewriteConfig;
  readonly infrastructure: RewriteInfrastructure;
  readonly identity: IdentityService;
  readonly credits: CreditService;
  readonly projects: ProjectService;
  readonly uploads: UploadService;
  readonly aiJobs: AiJobService;

  constructor() {
    this.config = loadRewriteConfig(process.env);
    this.infrastructure = new RewriteInfrastructure(this.config);
    this.identity = new IdentityService(
      this.infrastructure.database,
      this.config.sessionSecret,
      this.config.nodeEnvironment
    );
    this.credits = new CreditService(this.infrastructure.database);
    this.projects = new ProjectService(this.infrastructure.database);
    this.uploads = new UploadService(this.infrastructure.database, this.infrastructure.storage);
    this.aiJobs = new AiJobService(this.infrastructure.database, this.infrastructure.storage);
  }

  checkReadiness(): Promise<ReadinessResult> {
    return this.infrastructure.checkReadiness();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.infrastructure.close();
  }
}
