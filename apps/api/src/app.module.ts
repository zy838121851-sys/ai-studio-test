import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiJobsController } from "./ai-jobs/ai-jobs.controller.js";
import { SessionAuthGuard } from "./auth/auth-context.js";
import { AuthController } from "./auth/auth.controller.js";
import { CapabilitiesController } from "./capabilities.controller.js";
import { ConversationsController } from "./conversations/conversations.controller.js";
import { CreditsController } from "./credits.controller.js";
import { HealthController } from "./health.controller.js";
import { HomeController } from "./home.controller.js";
import { ModelsController } from "./models.controller.js";
import { PlatformService } from "./platform.service.js";
import { ProjectsController } from "./projects/projects.controller.js";
import { UploadsController } from "./uploads.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["rewrite.env.local"]
    })
  ],
  controllers: [
    HealthController,
    CapabilitiesController,
    ConversationsController,
    AuthController,
    ModelsController,
    CreditsController,
    ProjectsController,
    UploadsController,
    AiJobsController,
    HomeController
  ],
  providers: [PlatformService, SessionAuthGuard],
  exports: [PlatformService]
})
export class AppModule {}
