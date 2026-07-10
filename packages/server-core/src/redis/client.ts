import { Redis } from "ioredis";

export function createRedisClient(redisUrl: string): Redis {
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
}

export async function checkRedisConnection(redis: Redis): Promise<void> {
  if (redis.status === "wait") {
    await redis.connect();
  }
  await redis.ping();
}
