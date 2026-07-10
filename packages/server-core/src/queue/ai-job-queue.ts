import { Queue, type ConnectionOptions } from "bullmq";

export const AI_JOB_QUEUE_NAME = "ai-studio-ai-jobs";

export function createBullConnectionOptions(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  const databasePath = url.pathname.replace(/^\//, "");

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: databasePath ? Number(databasePath) : 0,
    tls: url.protocol === "rediss:" ? {} : undefined,
    maxRetriesPerRequest: null
  };
}

export function createAiJobQueue(redisUrl: string): Queue {
  return new Queue(AI_JOB_QUEUE_NAME, {
    connection: createBullConnectionOptions(redisUrl),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000
    }
  });
}
