import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { WorkerPlatformService } from "./worker-platform.service.js";

@Injectable()
export class ComplianceRecoveryService implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(@Inject(WorkerPlatformService) private readonly platform: WorkerPlatformService) {}

  onModuleInit(): void {
    void this.recover();
    this.timer = setInterval(() => void this.recover(), 5_000);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async recover(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const work = await this.platform.compliance.listRecoverableWork();
      for (const id of work.moderationJobIds) {
        await this.platform.compliance.processModeration(id);
      }
      for (const id of work.notificationIds) {
        await this.platform.compliance.processNotification(id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Compliance recovery failed";
      process.stderr.write(`${JSON.stringify({ level: "error", service: "ai-studio-rewrite-worker", message })}\n`);
    } finally {
      this.running = false;
    }
  }
}
