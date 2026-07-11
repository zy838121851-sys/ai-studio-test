import { describe, expect, it } from "vitest";

import { appendPenPoint, finishPenStroke, penPathData, startPenStroke } from "./index.js";

describe("pen stroke state machine", () => {
  it("preserves recorded pointer samples in order", () => {
    const stroke = appendPenPoint(startPenStroke("pen-1", { x: 10, y: 20, pressure: 0.3 }, "#111", 6), { x: 30, y: 40, pressure: 0.7 });
    expect(finishPenStroke(stroke)).toMatchObject({ kind: "pen", x: 10, y: 20, width: 20, height: 20, points: [{ x: 10, y: 20, pressure: 0.3 }, { x: 30, y: 40, pressure: 0.7 }] });
    expect(penPathData(stroke.points)).toBe("M10 20 L30 40");
  });

  it("rejects a one-point stroke", () => {
    expect(finishPenStroke(startPenStroke("pen-1", { x: 0, y: 0, pressure: 0.5 }))).toBeNull();
  });
});
