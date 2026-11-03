// Camelot key moves (design D5, spec: transition-compatibility).

import type { Camelot } from "$lib/library/types";

export type Move =
  | "same"
  | "up1"
  | "down1"
  | "relative"
  | "diagonal"
  | "up2"
  | "down2"
  | "semitoneUp"
  | "semitoneDown"
  | "parallel";

export const MOVE_LABEL: Record<Move, string> = {
  same: "same",
  up1: "+1",
  down1: "−1",
  relative: "relative",
  diagonal: "diagonal",
  up2: "+2",
  down2: "−2",
  semitoneUp: "semitone up",
  semitoneDown: "semitone down",
  parallel: "parallel",
};

export const codeOf = (c: Camelot) => `${c.num}${c.letter}`;

/** Clockwise steps from `from` to `to` around the wheel, 0–11. */
const steps = (from: Camelot, to: Camelot) => (((to.num - from.num) % 12) + 12) % 12;

/** Classifies the key relationship from `from` to `to`, or `null` when unrelated. */
export function classifyMove(from: Camelot, to: Camelot): Move | null {
  const d = steps(from, to);
  if (from.letter === to.letter) {
    switch (d) {
      case 0: return "same";
      case 1: return "up1";
      case 11: return "down1";
      case 2: return "up2";
      case 10: return "down2";
      // +7 numbers is one semitone up, +5 (−7) one semitone down.
      case 7: return "semitoneUp";
      case 5: return "semitoneDown";
      default: return null;
    }
  }
  if (d === 0) return "relative";
  if (d === 1 || d === 11) return "diagonal";
  // Same tonic, other mode: A minor (8A) ↔ A major (11B).
  if ((from.letter === "A" && d === 3) || (from.letter === "B" && d === 9)) return "parallel";
  return null;
}

/**
 * Signed shortest direction around the wheel, −5…+6: positive is clockwise.
 * Semitone moves are 5 steps the other way round (e.g. semitone up is −5).
 */
export function wheelDirection(from: Camelot, to: Camelot): number {
  const d = steps(from, to);
  return d > 6 ? d - 12 : d;
}

/** Every Camelot code reachable from `from` by a catalogue move. */
export function reachableCodes(from: Camelot): Camelot[] {
  const out: Camelot[] = [];
  for (const letter of ["A", "B"] as const) {
    for (let num = 1; num <= 12; num++) {
      const to = { num, letter };
      if (classifyMove(from, to)) out.push(to);
    }
  }
  return out;
}
