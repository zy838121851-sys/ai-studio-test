import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import {
  AiJobService,
  AssetService,
  CatalogService,
  CreditService,
  createCapabilityRegistry,
  createIdentityProviders,
  createPaymentProviders,
  ConversationService,
  IdentityService,
  OrderPaymentService,
  loadRewriteConfig,
  ProjectService,
  RewriteInfrastructure,
  type ReadinessResult,
  type CapabilityRegistry,
  type IdentityProviders,
  type RewriteConfig,
  UploadService
} from "@ai-studio/server-core";

@Injectable()
export class PlatformService implements OnApplicationShutdown {
  readonly config: RewriteConfig;
  readonly infrastructure: RewriteInfrastructure;
  readonly identity: IdentityService;
  readonly identityProviders: IdentityProviders;
  readonly capabilities: CapabilityRegistry;
  readonly credits: CreditService;
  readonly projects: ProjectService;
  readonly uploads: UploadService;
  readonly aiJobs: AiJobService;
  readonly assets: AssetService;
  readonly catalog: CatalogService;
  readonly conversations: ConversationService;
  readonly orderPayments: OrderPaymentService;

  constructor() {
    this.config = loadRewriteConfig(process.env);
    this.infrastructure = new RewriteInfrastructure(this.config);
    this.capabilities = createCapabilityRegistry(this.config);
    this.identityProviders = createIdentityProviders(this.config.nodeEnvironment);
    this.identity = new IdentityService(
      this.infrastructure.database,
      this.config.sessionSecret,
      this.identityProviders
    );
    this.credits = new CreditService(this.infrastructure.database);
    this.projects = new ProjectService(this.infrastructure.database);
    this.uploads = new UploadService(this.infrastructure.database, this.infrastructure.storage);
    this.aiJobs = new AiJobService(this.infrastructure.database, this.infrastructure.storage);
    this.assets = new AssetService(this.infrastructure.database);
    this.catalog = new CatalogService(this.infrastructure.database);
    this.conversations = new ConversationService(this.infrastructure.database);
    this.orderPayments = new OrderPaymentService(
      this.infrastructure.database,
      this.config.nodeEnvironment,
      createPaymentProviders(this.config.nodeEnvironment, "", this.config.wechatPay, this.config.alipay),
      this.capabilities
    );
  }

  checkReadiness(): Promise<ReadinessResult> {
    return this.infrastructure.checkReadiness();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.infrastructure.close();
  }
}
