import { describe, expect, it } from "vitest";

import { createBullConnectionOptions } from "./ai-job-queue.js";

describe("createBullConnectionOptions", () => {
  it("normalizes a secure Redis URL for BullMQ", () => {
    expect(createBullConnectionOptions("rediss://user:secret@redis.example.com:6380/2")).toMatchObject(
      {
        host: "redis.example.com",
        port: 6380,
        username: "user",
        password: "secret",
        db: 2,
        tls: {}
      }
    );
  });
});
