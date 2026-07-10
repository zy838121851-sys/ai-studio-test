import { describe, expect, it } from "vitest";

import { WorkerModule } from "./worker.module.js";

describe("WorkerModule", () => {
  it("exposes a dedicated worker composition root", () => {
    expect(WorkerModule).toBeTypeOf("function");
  });
});
