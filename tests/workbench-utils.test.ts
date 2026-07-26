import { describe, expect, it } from "vitest";

import { demos } from "../app/circuit-data";
import {
  fitGraphPoint,
  layoutGraphPoints,
  layoutRiverPoints,
  validationBarPercent,
} from "../app/workbench-utils";

describe("workbench geometry and validation helpers", () => {
  it("insets every authored graph coordinate within fit-safe bounds", () => {
    expect(fitGraphPoint(0, 0)).toEqual({ x: 14, y: 10 });
    expect(fitGraphPoint(100, 100)).toEqual({ x: 86, y: 90 });
    expect(fitGraphPoint(-20, 130)).toEqual({ x: 14, y: 90 });
  });

  it("scales validation bars from selected values without hiding zero", () => {
    expect(validationBarPercent(0.72, 0.72)).toBe(100);
    expect(validationBarPercent(0.36, 0.72)).toBe(50);
    expect(validationBarPercent(0, 0.72)).toBe(4);
    expect(validationBarPercent(-2, 0)).toBe(4);
  });

  it("assigns distinct vertical lanes to same-layer river nodes", () => {
    const points = layoutRiverPoints([
      { id: "primary", layer: 12, contribution: 0.9, kind: "mlp" },
      { id: "secondary", layer: 12, contribution: 0.2, kind: "sae" },
      { id: "error", layer: 12, contribution: -0.1, kind: "error" },
      { id: "output", layer: 18, contribution: 1, kind: "logit" },
    ]);

    expect(points.get("primary")).toEqual({ x: 64, y: 27 });
    expect(points.get("secondary")).toEqual({ x: 64, y: 50.5 });
    expect(points.get("error")).toEqual({ x: 64, y: 74 });
    expect(points.get("output")).toEqual({ x: 92, y: 46 });
  });

  it("keeps authored graph cards separate at the narrowest canvas", () => {
    const canvasWidth = 1120;
    const canvasHeight = 500;
    const cardWidth = 112;
    const cardHeight = 58;

    for (const demo of demos) {
      const points = layoutGraphPoints(demo.features);
      const boxes = demo.features.map((feature) => {
        const point = points.get(feature.id)!;
        return {
          id: feature.id,
          x: (point.x / 100) * canvasWidth,
          y: (point.y / 100) * canvasHeight,
        };
      });

      for (let index = 0; index < boxes.length; index += 1) {
        for (let next = index + 1; next < boxes.length; next += 1) {
          const a = boxes[index];
          const b = boxes[next];
          const overlaps =
            Math.abs(a.x - b.x) < cardWidth &&
            Math.abs(a.y - b.y) < cardHeight;
          expect(
            overlaps,
            `${demo.id}: ${a.id} overlaps ${b.id}`,
          ).toBe(false);
        }
      }
    }
  });
});
