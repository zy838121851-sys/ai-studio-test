import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { WorkerPlatformService } from "./worker-platform.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["rewrite.env.local"]
    })
  ],
  providers: [WorkerPlatformService]
})
export class WorkerModule {}
