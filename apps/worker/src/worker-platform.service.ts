import {
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit
} from "@nestjs/common";
import {
  AiJobService,
  ComplianceService,
  createComplianceProviders,
  createImageProvider,
  ApimartVideoProvider,
  loadRewriteConfig,
  RewriteInfrastructure
  , SubscriptionService
} from "@ai-studio/server-core";

@Injectable()
export class WorkerPlatformService implements OnModuleInit, OnApplicationShutdown {
  readonly config = loadRewriteConfig(process.env);
  readonly infrastructure = new RewriteInfrastructure(this.config);
  readonly aiJobs = new AiJobService(this.infrastructure.database, this.infrastructure.storage);
  readonly compliance = new ComplianceService(
    this.infrastructure.database,
    createComplianceProviders(this.config.nodeEnvironment)
  );
  readonly subscriptions = new SubscriptionService(this.infrastructure.database);
  readonly imageProvider = createImageProvider(this.config);
  readonly videoProvider =
    this.config.imageProvider.provider === "apimart"
      ? new ApimartVideoProvider(this.config.imageProvider.apiKey, this.config.imageProvider.baseUrl)
      : null;

  async onModuleInit(): Promise<void> {
    const readiness = await this.infrastructure.checkReadiness();
    if (!readiness.ready) {
      throw new Error("Rewrite worker infrastructure is not ready.");
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.infrastructure.close();
  }
}
