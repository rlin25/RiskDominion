// Pure geometric pattern generators for territory dimension fills. NO React.
// Every function is deterministic: all "randomness" is seeded from territoryId
// via an inline mulberry32 PRNG (never Math.random / Date.now). The four
// dimensions read as distinct textures even in greyscale:
//   military  -> inward contour lines (topographic offsets)
//   economic  -> jittered dot grid
//   cultural  -> 45deg cross-hatch
//   covert    -> sparse poisson-disk dots
// clipPath at the render layer trims any geometry that overflows the territory,
// so these functions favour robustness over sub-pixel precision.

import { polygonContains } from "d3-polygon";
import type { TerritoryState } from "../types";

export interface PatternInput {
  territoryId: number;
  ringsPx: [number, number][][]; // projected rings in pixel space; [0] is outer
  bboxPx: [number, number, number, number]; // [minX, minY, maxX, maxY]
  areaPx: number;
  centroidPx: [number, number];
}

export type LineSeg = { x1: number; y1: number; x2: number; y2: number };
export type Dot = { cx: number; cy: number; r: number };

// ---- deterministic PRNG -----------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- shared helpers ---------------------------------------------------------

// Density scaling. The spacing scales with sqrt(area) toward a fixed per-cell
// budget, so a continent-sized territory produces roughly the same number of
// pattern cells as a small one instead of tens of thousands. Spacing is floored
// at `base` so small/medium territories keep the original look. Tiny territories
// fall back to a single descriptive dot per owner.
const CELL_BUDGET = 85; // approx pattern cells per territory across its area

export function resolveSpacing(
  areaPx: number,
  base: number,
): { spacing: number; mode: "full" | "single-dot" } {
  if (areaPx < 500) return { spacing: base, mode: "single-dot" };
  const spacing = Math.max(base, Math.sqrt(areaPx / CELL_BUDGET));
  return { spacing, mode: "full" };
}

// Douglas-Peucker polyline simplification. Real coastlines carry hundreds of
// vertices; contouring them verbatim is what produced tens of thousands of
// line segments. Reducing to a coarse outline first cuts that cost ~10x with no
// visible change at map scale.
function simplifyRing(ring: [number, number][], tol: number): [number, number][] {
  const n = ring.length;
  if (n <= 8) return ring;
  const keep = new Array<boolean>(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const tol2 = tol * tol;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const seg = stack.pop();
    if (!seg) break;
    const [s, e] = seg;
    const [ax, ay] = ring[s];
    const [bx, by] = ring[e];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = ring[i];
      const t = ((px - ax) * dx + (py - ay) * dy) / len2;
      const cx = ax + t * dx;
      const cy = ay + t * dy;
      const d2 = (px - cx) * (px - cx) + (py - cy) * (py - cy);
      if (d2 > maxD) {
        maxD = d2;
        idx = i;
      }
    }
    if (maxD > tol2 && idx > 0) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i]);
  return out;
}

function outerRing(input: PatternInput): [number, number][] {
  return input.ringsPx[0] ?? [];
}

// Signed area (shoelace) of a ring; used to detect inward-offset collapse.
function ringArea(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

// Ensure a ring is counter-clockwise in screen space (y-down). Screen y is
// flipped vs. math convention, so we treat negative shoelace area as CCW here;
// callers only need a consistent orientation for inward offsetting.
function normalizeRing(ring: [number, number][]): [number, number][] {
  // Drop a duplicated closing point if present.
  const r =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring.slice();
  return r;
}

// Offset a closed ring inward by `dist` pixels along each vertex's angle
// bisector. Returns the new ring (may self-intersect on concavities; clipPath
// at render time cleans up the resulting line artifacts).
function offsetRingInward(
  ring: [number, number][],
  dist: number,
): [number, number][] {
  const n = ring.length;
  if (n < 3) return [];
  // Determine winding so we always push toward the interior.
  const sign = ringArea(ring) < 0 ? 1 : -1;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n];
    const curr = ring[i];
    const next = ring[(i + 1) % n];

    // Unit edge normals (rotate edge direction by 90deg).
    const e1x = curr[0] - prev[0];
    const e1y = curr[1] - prev[1];
    const e2x = next[0] - curr[0];
    const e2y = next[1] - curr[1];
    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;
    // Inward normals depend on winding sign.
    const n1x = (sign * -e1y) / l1;
    const n1y = (sign * e1x) / l1;
    const n2x = (sign * -e2y) / l2;
    const n2y = (sign * e2x) / l2;

    let bx = n1x + n2x;
    let by = n1y + n2y;
    const bl = Math.hypot(bx, by);
    if (bl < 1e-6) {
      // Degenerate (180deg turn): fall back to one edge normal.
      bx = n1x;
      by = n1y;
    } else {
      bx /= bl;
      by /= bl;
    }
    out.push([curr[0] + bx * dist, curr[1] + by * dist]);
  }
  return out;
}

// ---- military: inward contour rings ----------------------------------------

export function militaryContours(input: PatternInput): LineSeg[] {
  const ringRaw = outerRing(input);
  if (ringRaw.length < 3) return [];
  const { spacing } = resolveSpacing(input.areaPx, 6);
  // resolveSpacing doubles on mid-size territories; that becomes our interval.
  const interval = spacing;

  const segs: LineSeg[] = [];
  // Simplify the coastline before offsetting so a high-vertex ring does not
  // explode into thousands of segments per nested contour.
  let ring = simplifyRing(normalizeRing(ringRaw), 2.5);
  const startArea = Math.abs(ringArea(ring));
  // Emit a capped number of nested contours; stop once the ring collapses.
  for (let step = 0; step < 5; step++) {
    ring = offsetRingInward(ring, interval);
    const area = Math.abs(ringArea(ring));
    if (ring.length < 3 || area < startArea * 0.04) break;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      segs.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    }
  }
  return segs;
}

// ---- economic: jittered dot grid -------------------------------------------

export function economicDots(input: PatternInput): Dot[] {
  const ring = outerRing(input);
  if (ring.length < 3) return [];
  const { spacing } = resolveSpacing(input.areaPx, 8);
  const [minX, minY, maxX, maxY] = input.bboxPx;
  const rand = mulberry32(input.territoryId * 2654435761);

  const dots: Dot[] = [];
  for (let y = minY + spacing / 2; y <= maxY; y += spacing) {
    for (let x = minX + spacing / 2; x <= maxX; x += spacing) {
      const jx = x + (rand() * 4 - 2); // +/- 2px jitter
      const jy = y + (rand() * 4 - 2);
      if (polygonContains(ring, [jx, jy])) {
        dots.push({ cx: jx, cy: jy, r: 0.75 });
      }
    }
  }
  return dots;
}

// ---- cultural: 45deg cross-hatch -------------------------------------------

export function culturalHatch(input: PatternInput): LineSeg[] {
  const [minX, minY, maxX, maxY] = input.bboxPx;
  const { spacing } = resolveSpacing(input.areaPx, 10);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return [];

  const segs: LineSeg[] = [];
  // Two families of parallel lines at +45 and -45 degrees. We sweep a line
  // intercept `c` across the bbox and intersect with the bbox edges. clipPath
  // trims the final overflow to the territory polygon.
  // For slope +1 (y = x + c): c ranges from (minY - maxX) to (maxY - minX).
  for (let c = minY - maxX; c <= maxY - minX; c += spacing) {
    // Clip line y = x + c to the box [minX..maxX] x [minY..maxY].
    const x1 = minX;
    const y1 = x1 + c;
    const x2 = maxX;
    const y2 = x2 + c;
    segs.push(...clipLineToBox(x1, y1, x2, y2, minX, minY, maxX, maxY));
  }
  // For slope -1 (y = -x + c): c ranges from (minY + minX) to (maxY + maxX).
  for (let c = minY + minX; c <= maxY + maxX; c += spacing) {
    const x1 = minX;
    const y1 = -x1 + c;
    const x2 = maxX;
    const y2 = -x2 + c;
    segs.push(...clipLineToBox(x1, y1, x2, y2, minX, minY, maxX, maxY));
  }
  return segs;
}

// Liang-Barsky line clip to an axis-aligned box. Returns [] or a single seg.
function clipLineToBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): LineSeg[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return [];
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return [];
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return [];
        if (r < t1) t1 = r;
      }
    }
  }
  return [
    {
      x1: x1 + t0 * dx,
      y1: y1 + t0 * dy,
      x2: x1 + t1 * dx,
      y2: y1 + t1 * dy,
    },
  ];
}

// ---- covert: poisson-disk dots ---------------------------------------------

export function covertPoisson(input: PatternInput): Dot[] {
  const ring = outerRing(input);
  if (ring.length < 3) return [];
  const { spacing } = resolveSpacing(input.areaPx, 8);
  const minDist = spacing;
  const [minX, minY, maxX, maxY] = input.bboxPx;
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return [];

  // Bridson's algorithm over the bbox, rejecting samples outside the polygon.
  const rand = mulberry32(input.territoryId * 40503 + 17);
  const cell = minDist / Math.SQRT2;
  const gw = Math.max(1, Math.ceil(w / cell));
  const gh = Math.max(1, Math.ceil(h / cell));
  const grid: ([number, number] | null)[] = new Array(gw * gh).fill(null);
  const samples: [number, number][] = [];
  const active: [number, number][] = [];

  const gridIndex = (x: number, y: number) => {
    const gx = Math.floor((x - minX) / cell);
    const gy = Math.floor((y - minY) / cell);
    return { gx, gy };
  };
  const fits = (x: number, y: number) => {
    const { gx, gy } = gridIndex(x, y);
    for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2); yy++) {
      for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
        const s = grid[yy * gw + xx];
        if (s && Math.hypot(s[0] - x, s[1] - y) < minDist) return false;
      }
    }
    return true;
  };
  const addSample = (x: number, y: number) => {
    const { gx, gy } = gridIndex(x, y);
    grid[gy * gw + gx] = [x, y];
    samples.push([x, y]);
    active.push([x, y]);
  };

  // Seed near the centroid if it is inside; otherwise scan for any inside point.
  if (polygonContains(ring, input.centroidPx)) {
    addSample(input.centroidPx[0], input.centroidPx[1]);
  } else {
    let seeded = false;
    for (let i = 0; i < 30 && !seeded; i++) {
      const x = minX + rand() * w;
      const y = minY + rand() * h;
      if (polygonContains(ring, [x, y])) {
        addSample(x, y);
        seeded = true;
      }
    }
    if (!seeded) return [];
  }

  const k = 30;
  while (active.length > 0) {
    const idx = Math.floor(rand() * active.length);
    const [px, py] = active[idx];
    let found = false;
    for (let i = 0; i < k; i++) {
      const ang = rand() * Math.PI * 2;
      const rad = minDist * (1 + rand()); // [minDist, 2*minDist)
      const nx = px + Math.cos(ang) * rad;
      const ny = py + Math.sin(ang) * rad;
      if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
      if (!polygonContains(ring, [nx, ny])) continue;
      if (!fits(nx, ny)) continue;
      addSample(nx, ny);
      found = true;
      break;
    }
    if (!found) active.splice(idx, 1);
  }

  return samples.map(([cx, cy]) => ({ cx, cy, r: 1 }));
}

// ---- unified-territory detection -------------------------------------------

// Returns the owning player id if the territory is held in all four dimensions
// by the same (non-neutral) player, otherwise null. Used to switch a territory
// to a solid gold-bordered fill (no patterns).
export function isUnified(state: TerritoryState): number | null {
  const o = state.militaryOwner;
  if (
    o > 0 &&
    state.economicOwner === o &&
    state.covertOwner === o &&
    state.culturalOwner === o
  ) {
    return o;
  }
  return null;
}

// ---- single-dot fallback (tiny territories) --------------------------------

// Up to 4 positions in a short horizontal row centred on the centroid; the
// caller draws one r=2 dot per owned dimension, coloured by that dimension's
// owner, so a tiny territory still legibly reports its holdings.
export function singleDotPositions(
  centroidPx: [number, number],
  count: number,
): [number, number][] {
  const n = Math.max(0, Math.min(4, count));
  if (n === 0) return [];
  const gap = 5;
  const totalW = (n - 1) * gap;
  const startX = centroidPx[0] - totalW / 2;
  const positions: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    positions.push([startX + i * gap, centroidPx[1]]);
  }
  return positions;
}
