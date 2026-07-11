import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from "@nestjs/common";

import { WorkerPlatformService } from "./worker-platform.service.js";

@Injectable()
export class SubscriptionRecoveryService implements OnModuleInit, OnApplicationShutdown {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(@Inject(WorkerPlatformService) private readonly platform: WorkerPlatformService) {}

  onModuleInit(): void {
    void this.recover();
    this.timer = setInterval(() => void this.recover(), 60_000);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async recover(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.platform.subscriptions.advanceDue();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subscription recovery failed";
      process.stderr.write(`${JSON.stringify({ level: "error", service: "ai-studio-rewrite-worker", message })}\n`);
    } finally {
      this.running = false;
    }
  }
}
