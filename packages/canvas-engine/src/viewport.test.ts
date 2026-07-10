import { describe, expect, it } from "vitest";

import { fitBoundsToViewport, screenToWorld, worldToScreen, zoomViewportAt } from "./viewport.js";

describe("viewport coordinate system", () => {
  it("round-trips pointer coordinates at supported zoom levels", () => {
    for (const zoom of [0.1, 0.5, 1, 2, 4]) {
      const viewport = { x: 120, y: -40, zoom };
      const point = { x: 731.25, y: 211.5 };
      expect(worldToScreen(screenToWorld(point, viewport), viewport)).toEqual(point);
    }
  });

  it("keeps the zoom anchor fixed", () => {
    const anchor = { x: 420, y: 300 };
    const viewport = zoomViewportAt({ x: 40, y: 20, zoom: 1 }, 2, anchor);
    expect(worldToScreen(screenToWorld(anchor, viewport), viewport)).toEqual(anchor);
  });

  it("fits world bounds without changing their center", () => {
    const viewport = fitBoundsToViewport({ x: 100, y: 50, width: 800, height: 400 }, { width: 1000, height: 800 }, 50);
    const topLeft = worldToScreen({ x: 100, y: 50 }, viewport);
    const bottomRight = worldToScreen({ x: 900, y: 450 }, viewport);
    expect((topLeft.x + bottomRight.x) / 2).toBe(500);
    expect((topLeft.y + bottomRight.y) / 2).toBe(400);
  });
});
