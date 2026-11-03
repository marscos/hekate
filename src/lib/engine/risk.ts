// Harmonic risk from Krumhansl–Kessler key profiles (design D6).
//
// Each key's probe-tone profile (how well each pitch class fits the key, as
// rated by listeners) is correlated with the other key's. Closely related keys
// correlate strongly. Risk is (1 − r) / 2, normalised so the same key is 0 and
// the most distant catalogue move is 1.

import type { Camelot } from "$lib/library/types";
import { classifyMove } from "./camelot";

// Krumhansl & Kessler (1982), starting at the tonic.
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** Tonic pitch class (C = 0). 8B is C major, 8A is A minor; one number is a fifth. */
export function tonic(c: Camelot): number {
  const base = c.letter === "B" ? 0 : 9;
  return (((base + 7 * (c.num - 8)) % 12) + 12) % 12;
}

function profile(c: Camelot): number[] {
  const p = c.letter === "B" ? MAJOR : MINOR;
  const t = tonic(c);
  // Value for pitch class `pc` is the profile at its distance above the tonic.
  return Array.from({ length: 12 }, (_, pc) => p[(pc - t + 12) % 12]);
}

function pearson(a: number[], b: number[]): number {
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

const KEYS: Camelot[] = (["A", "B"] as const).flatMap((letter) =>
  Array.from({ length: 12 }, (_, i) => ({ num: i + 1, letter })),
);
const index = (c: Camelot) => (c.letter === "A" ? 0 : 12) + c.num - 1;

const RAW: number[][] = KEYS.map((a) => KEYS.map((b) => (1 - pearson(profile(a), profile(b))) / 2));

// Normalise over pairs related by a catalogue move.
const catalogueRaw = KEYS.flatMap((a) => KEYS.filter((b) => classifyMove(a, b)).map((b) => RAW[index(a)][index(b)]));
const MAX = Math.max(...catalogueRaw);

/** Harmonic risk of moving from key `a` to key `b`: 0 (safest) to 1 (riskiest catalogue move). */
export function harmonicRisk(a: Camelot, b: Camelot): number {
  return Math.min(1, RAW[index(a)][index(b)] / MAX);
}
