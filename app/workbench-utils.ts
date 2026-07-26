export type GraphPan = { x: number; y: number };

/**
 * Insets authored 0–100 fixture coordinates so even fixed-width nodes remain
 * visible at Fit. This is shared by nodes, edges, and the minimap.
 */
export function fitGraphPoint(x: number, y: number) {
  return {
    x: 14 + Math.max(0, Math.min(100, x)) * 0.72,
    y: 10 + Math.max(0, Math.min(100, y)) * 0.8,
  };
}

export function validationBarPercent(value: number, maximum: number) {
  if (maximum <= 0) return 4;
  return Math.max(4, Math.min(100, (Math.abs(value) / maximum) * 100));
}
