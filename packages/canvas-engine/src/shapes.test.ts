import { describe, expect, it } from "vitest";

import { createArrowGeometry, createArrowNode, createShapeNode, SHAPE_REGISTRY } from "./index.js";

describe("shape and arrow registry", () => {
  it("creates every registered shape with stable geometry", () => {
    expect(SHAPE_REGISTRY).toEqual(["rectangle", "ellipse", "diamond", "triangle", "star"]);
    expect(createShapeNode("shape-1", "diamond", 10, 20, 80, 60)).toMatchObject({ kind: "shape", shapeType: "diamond" });
  });

  it("keeps arrow angle and length tied to actual pointer endpoints", () => {
    const geometry = createArrowGeometry({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(geometry.length).toBe(5);
    expect(geometry.angle).toBeCloseTo(Math.atan2(4, 3));
    expect(createArrowNode("arrow-1", { x: 20, y: 30 }, { x: 5, y: 10 })).toMatchObject({ x: 5, y: 10, width: 15, height: 20 });
  });
});
