import { describe, expect, it } from "vitest";

import {
  fitGraphPoint,
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
});
