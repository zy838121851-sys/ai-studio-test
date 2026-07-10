import { describe, expect, it } from "vitest";

import { assertRewriteEnvironment } from "./index.js";

describe("assertRewriteEnvironment", () => {
  it("rejects local storage in production", () => {
    expect(() =>
      assertRewriteEnvironment({ nodeEnv: "production", storageProvider: "local" })
    ).toThrow("Production rewrite must use the OSS storage provider.");
  });
});
