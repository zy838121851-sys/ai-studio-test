import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit
} from "@nestjs/common";
import {
  AI_JOB_QUEUE_NAME,
  createAiJobQueue,
  createBullConnectionOptions,
  type AiJobQueuePayload
} from "@ai-studio/server-core";
import { Worker, type Job, type Queue } from "bullmq";

import { WorkerPlatformService } from "./worker-platform.service.js";

@Injectable()
export class AiJobConsumerService implements OnModuleInit, OnApplicationShutdown {
  private queue: Queue<AiJobQueuePayload> | undefined;
  private worker: Worker<AiJobQueuePayload> | undefined;
  private dispatchTimer: ReturnType<typeof setInterval> | undefined;
  private dispatching = false;

  constructor(@Inject(WorkerPlatformService) private readonly platform: WorkerPlatformService) {}

  async onModuleInit(): Promise<void> {
    this.queue = createAiJobQueue(this.platform.config.redisUrl);
    this.worker = new Worker<AiJobQueuePayload>(
      AI_JOB_QUEUE_NAME,
      (job) => this.process(job),
      {
        connection: createBullConnectionOptions(this.platform.config.redisUrl),
        concurrency: this.platform.config.workerConcurrency
      }
    );
    this.worker.on("error", (error) => {
      process.stderr.write(
        `${JSON.stringify({ level: "error", service: "ai-studio-rewrite-worker", message: error.message })}\n`
      );
    });

    await Promise.all([this.queue.waitUntilReady(), this.worker.waitUntilReady()]);
    await this.dispatchAvailableJobs();
    this.dispatchTimer = setInterval(() => {
      void this.dispatchAvailableJobs().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Outbox dispatch failed";
        process.stderr.write(
          `${JSON.stringify({ level: "error", service: "ai-studio-rewrite-worker", message })}\n`
        );
      });
    }, 2_000);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.dispatchTimer) {
      clearInterval(this.dispatchTimer);
    }
    await this.worker?.close();
    await this.queue?.close();
  }

  private async dispatchAvailableJobs(): Promise<void> {
    if (!this.queue || this.dispatching) return;
    this.dispatching = true;
    try {
      const events = await this.platform.aiJobs.listPendingOutbox();
      for (const event of events) {
        await this.enqueue(event.jobId);
        await this.platform.aiJobs.markOutboxPublished(event.id);
      }

      const recoverableJobIds = await this.platform.aiJobs.listRecoverableJobIds();
      for (const jobId of recoverableJobIds) {
        await this.enqueue(jobId);
      }
    } finally {
      this.dispatching = false;
    }
  }

  private async enqueue(jobId: string): Promise<void> {
    await this.queue?.add("generate-image", { jobId }, { jobId });
  }

  private async process(job: Job<AiJobQueuePayload>): Promise<void> {
    const current = await this.platform.aiJobs.markRunning(job.data.jobId);
    if (!current || ["succeeded", "failed", "cancelled"].includes(current.status)) {
      return;
    }

    try {
      const input = await this.platform.aiJobs.getWorkerInput(job.data.jobId);
      const image = await this.platform.imageProvider.generate({
        jobId: input.id,
        modelId: input.modelId,
        prompt: input.prompt,
        references: input.references
      });
      await this.platform.aiJobs.completeWithImage(job.data.jobId, image);
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const finalAttempt = job.attemptsMade + 1 >= attempts;
      if (finalAttempt) {
        const code =
          error instanceof Error && "code" in error && typeof error.code === "string"
            ? error.code
            : "AI_PROVIDER_FAILED";
        const message = error instanceof Error ? error.message : "图像生成失败";
        await this.platform.aiJobs.fail(job.data.jobId, code, message);
      }
      throw error;
    }
  }
}
