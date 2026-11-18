import { WORLD_GRID } from "./world-dots";

export interface MapView {
  lonMin: number;
  latMax: number;
  width: number;
  height: number;
}

const { step, lonMin: gridLonMin, latMax: gridLatMax, rows } = WORLD_GRID;

export const GRID_BOUNDS = {
  lonMin: gridLonMin,
  lonMax: gridLonMin + rows[0].length * step,
  latMax: gridLatMax,
  latMin: gridLatMax - rows.length * step,
} as const;

/**
 * SVG path for every land cell inside `view`, in view coordinates (degrees
 * from the top-left corner). One path keeps the whole map a single DOM node.
 */
export function landDotsPath(view: MapView, fill = 0.46): string {
  const size = step * fill;
  let d = "";
  rows.forEach((row, r) => {
    const lat = gridLatMax - (r + 0.5) * step;
    if (lat > view.latMax || lat < view.latMax - view.height) return;
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] !== "#") continue;
      const lon = gridLonMin + (c + 0.5) * step;
      if (lon < view.lonMin || lon > view.lonMin + view.width) continue;
      d += `M${(lon - view.lonMin - size / 2).toFixed(2)} ${(view.latMax - lat - size / 2).toFixed(2)}h${size}v${size}h-${size}z`;
    }
  });
  return d;
}
