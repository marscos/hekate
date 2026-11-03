// Describing one transition, and building the graph of compatible transitions
// (spec: transition-compatibility; design D5–D7).

import type { Camelot, Track } from "$lib/library/types";
import { matchBpm } from "./bpm";
import { classifyMove, codeOf, reachableCodes, wheelDirection, type Move } from "./camelot";
import { harmonicRisk } from "./risk";

export type Mood = "brighter" | "darker";

/** DJ-practice names for some moves. Labels only: they never change risk or mood. */
export const CONVENTION_LABEL: Partial<Record<Move, string>> = {
  up2: "+2 energy boost",
  semitoneUp: "semitone lift",
};

export interface Transition {
  from: number;
  to: number;
  move: Move;
  /** Signed shortest direction around the wheel (positive is clockwise). */
  direction: number;
  risk: number;
  /** The target key's mode: major sounds brighter, minor darker. */
  mood: Mood;
  label?: string;
  gapPct: number;
  halfDouble: boolean;
}

export const moodOf = (to: Camelot): Mood => (to.letter === "B" ? "brighter" : "darker");

/** The transition from `a` to `b`, or `null` when they are not compatible. */
export function describeTransition(a: Track, b: Track, tolerance: number): Transition | null {
  if (!a.usable || !b.usable || !a.camelot || !b.camelot || a.id === b.id) return null;
  const move = classifyMove(a.camelot, b.camelot);
  if (!move) return null;
  const bpm = matchBpm(a.bpm, b.bpm, tolerance);
  if (!bpm) return null;
  return {
    from: a.id,
    to: b.id,
    move,
    direction: wheelDirection(a.camelot, b.camelot),
    risk: harmonicRisk(a.camelot, b.camelot),
    mood: moodOf(b.camelot),
    label: CONVENTION_LABEL[move],
    gapPct: bpm.gapPct,
    halfDouble: bpm.halfDouble,
  };
}

export type TransitionGraph = Map<number, Transition[]>;

/**
 * All compatible transitions among `tracks`, keyed by source track. Tracks are
 * bucketed by key so only key-related pairs are compared.
 */
export function buildGraph(tracks: Iterable<Track>, tolerance: number): TransitionGraph {
  const byKey = new Map<string, Track[]>();
  const usable: Track[] = [];
  for (const t of tracks) {
    if (!t.usable || !t.camelot) continue;
    usable.push(t);
    const code = codeOf(t.camelot);
    byKey.set(code, [...(byKey.get(code) ?? []), t]);
  }
  const graph: TransitionGraph = new Map();
  for (const a of usable) {
    const out: Transition[] = [];
    for (const code of reachableCodes(a.camelot!)) {
      for (const b of byKey.get(codeOf(code)) ?? []) {
        const t = describeTransition(a, b, tolerance);
        if (t) out.push(t);
      }
    }
    graph.set(a.id, out);
  }
  return graph;
}

/** Compatible transitions from `current` to each of `candidates`. */
export function transitionsFrom(current: Track, candidates: Iterable<Track>, tolerance: number): Transition[] {
  const out: Transition[] = [];
  for (const c of candidates) {
    const t = describeTransition(current, c, tolerance);
    if (t) out.push(t);
  }
  return out;
}
