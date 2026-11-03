// Deterministic compass layout (design D9, spec: transition-compass).
//
// Coordinates are normalised: the now-playing track sits at (0, 0) and the
// riskiest catalogue move at radius 1. y grows downwards (screen convention).
//
//   side   → target mode: minor (darker) left, major (brighter) right
//   radius → harmonic risk
//   angle  → wheel direction: clockwise above the horizontal axis

import { MOVE_LABEL, type Move } from "./camelot";
import type { Suggestion } from "./ranking";

export const INNER_RADIUS = 0.18;
export const DEFAULT_SLOT_CAP = 8;
/** Degrees of elevation per step around the wheel (semitone moves are ±5 → ±80°). */
const DEGREES_PER_STEP = 16;
/** Spacing between tracks in a slot, in normalised units along the arc. */
const SPACING = 0.075;

/** Risk band edges, as drawn by the rings. */
export const RISK_RINGS = [0.35, 0.7, 1];

export interface CompassSlot {
  key: string;
  move: Move;
  label: string;
  side: "darker" | "brighter";
  /** Slot centre. */
  x: number;
  y: number;
  risk: number;
  /** Tracks left out beyond the cap. */
  overflow: number;
}

export interface CompassNode {
  suggestion: Suggestion;
  slot: string;
  /** 0 is nearest the slot centre (smallest BPM gap). */
  rank: number;
  x: number;
  y: number;
}

export interface CompassLayout {
  nodes: CompassNode[];
  slots: CompassSlot[];
}

export const radiusFor = (risk: number) => INNER_RADIUS + risk * (1 - INNER_RADIUS);

function polar(side: "darker" | "brighter", radius: number, elevationDeg: number) {
  const a = (elevationDeg * Math.PI) / 180;
  return { x: (side === "darker" ? -1 : 1) * radius * Math.cos(a), y: -radius * Math.sin(a) };
}

/** Lays out suggestions around the now-playing track. Same input, same output. */
export function compassLayout(suggestions: Suggestion[], cap = DEFAULT_SLOT_CAP): CompassLayout {
  const groups = new Map<string, Suggestion[]>();
  for (const s of suggestions) {
    const key = `${s.mood}:${s.move}:${s.direction}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  const nodes: CompassNode[] = [];
  const slots: CompassSlot[] = [];
  for (const key of [...groups.keys()].sort()) {
    const members = groups
      .get(key)!
      .slice()
      .sort((a, b) => Math.abs(a.gapPct) - Math.abs(b.gapPct) || a.to - b.to);
    const first = members[0];
    const side = first.mood;
    const elevation = Math.max(-5, Math.min(5, first.direction)) * DEGREES_PER_STEP;
    const radius = radiusFor(first.risk);
    const centre = polar(side, radius, elevation);
    slots.push({
      key,
      move: first.move,
      label: first.label ? `${MOVE_LABEL[first.move]} · ${first.label}` : MOVE_LABEL[first.move],
      side,
      ...centre,
      risk: first.risk,
      overflow: Math.max(0, members.length - cap),
    });
    members.slice(0, cap).forEach((s, rank) => {
      // Alternate either side of the centre along the arc: 0, +1, −1, +2, −2…
      const step = rank === 0 ? 0 : Math.ceil(rank / 2) * (rank % 2 === 1 ? 1 : -1);
      const offsetDeg = ((step * SPACING) / radius) * (180 / Math.PI);
      nodes.push({ suggestion: s, slot: key, rank, ...polar(side, radius, elevation + offsetDeg) });
    });
  }
  return { nodes, slots };
}
