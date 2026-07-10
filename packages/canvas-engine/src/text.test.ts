import { describe, expect, it } from "vitest";

import { createTextNode, updateTextNode } from "./index.js";

describe("canvas text tool", () => {
  it("creates and updates text while keeping formatting valid", () => {
    const node = createTextNode("text-1", "Hello", 10, 20);
    expect(updateTextNode(node, { text: "Updated", fontSize: 48, fontWeight: "bold" })).toMatchObject({ text: "Updated", fontSize: 48, fontWeight: "bold" });
    expect(updateTextNode(node, { fontSize: 0 }).fontSize).toBe(32);
  });
});
