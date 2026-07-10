import { describe, expect, it } from "vitest";

import { DevelopmentImageProvider } from "./development-image-provider.js";

describe("DevelopmentImageProvider", () => {
  it("creates deterministic non-empty SVG output without unescaped prompt markup", async () => {
    const provider = new DevelopmentImageProvider();
    const result = await provider.generate({
      jobId: "job-1",
      modelId: "gpt-image-2",
      prompt: "product <script>alert(1)</script>",
      references: []
    });
    const svg = result.body.toString("utf8");

    expect(result.contentType).toBe("image/svg+xml");
    expect(svg).toContain("product &lt;script&gt;");
    expect(svg).not.toContain("<script>");
  });
});
