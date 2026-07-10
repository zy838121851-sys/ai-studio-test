import { describe, expect, it } from "vitest";

import { listModels, quoteModel } from "./model-catalog.js";

describe("model catalog", () => {
  it("exposes the complete home model groups", () => {
    const models = listModels();

    expect(models.some((model) => model.id === "gpt-image-2" && model.isDefault)).toBe(true);
    expect(new Set(models.map((model) => model.modality))).toEqual(new Set(["image", "video", "3d"]));
  });

  it("returns an authoritative credit quote", () => {
    expect(quoteModel("gpt-image-2", 2)).toMatchObject({
      unitCredits: 8,
      totalCredits: 16
    });
  });
});
