import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { HealthController } from "./health.controller.js";
import { PlatformService } from "./platform.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["rewrite.env.local"]
    })
  ],
  controllers: [HealthController],
  providers: [PlatformService],
  exports: [PlatformService]
})
export class AppModule {}
