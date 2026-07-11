import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiJobConsumerService } from "./ai-job-consumer.service.js";
import { ComplianceRecoveryService } from "./compliance-recovery.service.js";
import { SubscriptionRecoveryService } from "./subscription-recovery.service.js";
import { WorkerPlatformService } from "./worker-platform.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["rewrite.env.local"]
    })
  ],
  providers: [WorkerPlatformService, AiJobConsumerService, ComplianceRecoveryService, SubscriptionRecoveryService]
})
export class WorkerModule {}
