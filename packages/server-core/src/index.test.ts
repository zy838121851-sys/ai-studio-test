import { describe, expect, it } from "vitest";

import { loadRewriteConfig } from "./index.js";

describe("server-core public API", () => {
  it("exports the rewrite configuration boundary", () => {
    expect(loadRewriteConfig({ NODE_ENV: "test" }).nodeEnvironment).toBe("test");
  });
});
