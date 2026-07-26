export type GraphPan = { x: number; y: number };
export type RiverFeature = {
  id: string;
  layer: number;
  contribution: number;
  kind: string;
};

/**
 * Insets authored 0–100 fixture coordinates so fixed-width nodes remain
 * visible inside the scroll-safe graph plane.
 */
export function fitGraphPoint(x: number, y: number) {
  return {
    x: 14 + Math.max(0, Math.min(100, x)) * 0.72,
    y: 10 + Math.max(0, Math.min(100, y)) * 0.8,
  };
}

/**
 * Preserves authored topology while applying the smallest horizontal nudge
 * needed to keep fixed-size cards from covering one another.
 */
export function layoutGraphPoints(
  features: Array<{ id: string; x: number; y: number }>,
) {
  const ordered = features
    .map((feature) => ({ ...feature, ...fitGraphPoint(feature.x, feature.y) }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const placed: Array<{ id: string; x: number; y: number }> = [];

  for (const feature of ordered) {
    let x = feature.x;
    let collision = placed.find(
      (item) =>
        Math.abs(item.x - x) < 10.2 && Math.abs(item.y - feature.y) < 11.6,
    );
    while (collision) {
      x = collision.x + 10.2;
      collision = placed.find(
        (item) =>
          Math.abs(item.x - x) < 10.2 &&
          Math.abs(item.y - feature.y) < 11.6,
      );
    }
    placed.push({ id: feature.id, x: Math.min(92, x), y: feature.y });
  }

  return new Map(placed.map((item) => [item.id, { x: item.x, y: item.y }]));
}

export function validationBarPercent(value: number, maximum: number) {
  if (maximum <= 0) return 4;
  return Math.max(4, Math.min(100, (Math.abs(value) / maximum) * 100));
}

/**
 * Gives each same-layer feature its own vertical lane. Error nodes are placed
 * last so the primary path remains above residual flow.
 */
export function layoutRiverPoints(features: RiverFeature[]) {
  const grouped = new Map<number, RiverFeature[]>();
  for (const feature of features) {
    const atLayer = grouped.get(feature.layer) ?? [];
    atLayer.push(feature);
    grouped.set(feature.layer, atLayer);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [layer, atLayer] of grouped) {
    const ordered = [...atLayer].sort((a, b) => {
      if (a.kind === "error") return 1;
      if (b.kind === "error") return -1;
      return b.contribution - a.contribution;
    });
    ordered.forEach((feature, index) => {
      const count = ordered.length;
      const y =
        count === 1
          ? feature.kind === "error"
            ? 74
            : 46
          : 27 + (index * 47) / Math.max(1, count - 1);
      positions.set(feature.id, {
        x: 8 + (layer / 18) * 84,
        y,
      });
    });
  }
  return positions;
}
