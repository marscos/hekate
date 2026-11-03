// Next-up ranking (design D8, spec: next-track-suggestions).

import type { Transition } from "./transition";

export type SuggestionSort = "best" | "bpm" | "risk";

export interface Suggestion extends Transition {
  /** Lower is better: risk and BPM gap (relative to the tolerance) weigh equally. */
  score: number;
  playedTonight: boolean;
}

export function score(t: Transition, tolerance: number): number {
  return t.risk + Math.abs(t.gapPct) / (tolerance * 100);
}

/** Ranks transitions for the next-up list. Played-tonight tracks always come last. */
export function rankSuggestions(
  transitions: Transition[],
  playedTonight: ReadonlySet<number>,
  tolerance: number,
  sort: SuggestionSort = "best",
): Suggestion[] {
  const key: Record<SuggestionSort, (s: Suggestion) => number> = {
    best: (s) => s.score,
    bpm: (s) => Math.abs(s.gapPct),
    risk: (s) => s.risk,
  };
  return transitions
    .map((t) => ({ ...t, score: score(t, tolerance), playedTonight: playedTonight.has(t.to) }))
    .sort((a, b) => Number(a.playedTonight) - Number(b.playedTonight) || key[sort](a) - key[sort](b) || a.score - b.score || a.to - b.to);
}
