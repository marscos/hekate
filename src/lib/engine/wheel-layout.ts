// Deterministic Camelot wheel map layout (design D11, spec: request-routing).
//
// Normalised coordinates: centre (0, 0), outer edge at radius 1, y downwards.
// 12 sits at the top and numbers increase clockwise; A (minor) keys fill the
// inner ring, B (major) keys the outer ring. Within a ring, radius grows with BPM.

import type { Camelot, Track } from "$lib/library/types";

export const RINGS = { A: [0.3, 0.62], B: [0.68, 1] } as const;
const SECTOR = Math.PI / 6;
/** Share of a sector's width used to spread its tracks. */
const SPREAD = 0.8;

export interface WheelNode {
  id: number;
  x: number;
  y: number;
}

export interface WheelLayout {
  nodes: Map<number, WheelNode>;
  bpmRange: [number, number];
}

/** Angle of a Camelot number's sector centre (12 at the top, clockwise). */
export const sectorAngle = (num: number) => (num % 12) * SECTOR - Math.PI / 2;

export function wheelPoint(c: Camelot, radius: number, angleOffset = 0) {
  const a = sectorAngle(c.num) + angleOffset;
  return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
}

/** Stable pseudo-random offset in [-0.5, 0.5) for a track id. */
function jitter(id: number) {
  const h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return (h % 10007) / 10007 - 0.5;
}

/** Places usable tracks on the wheel. Same tracks, same positions, in any order. */
export function wheelLayout(tracks: Iterable<Track>): WheelLayout {
  const usable = [...tracks].filter((t) => t.usable && t.camelot);
  const bpms = usable.map((t) => t.bpm);
  const min = bpms.length ? Math.min(...bpms) : 0;
  const max = bpms.length ? Math.max(...bpms) : 1;
  const span = max - min || 1;
  const nodes = new Map<number, WheelNode>();
  for (const t of usable) {
    const [inner, outer] = RINGS[t.camelot!.letter];
    const radius = inner + ((t.bpm - min) / span) * (outer - inner);
    nodes.set(t.id, { id: t.id, ...wheelPoint(t.camelot!, radius, jitter(t.id) * SECTOR * SPREAD) });
  }
  return { nodes, bpmRange: [min, max] };
}
