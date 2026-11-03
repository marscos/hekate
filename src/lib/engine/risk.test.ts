import { describe, expect, it } from "vitest";
import type { Camelot, Letter } from "$lib/library/types";
import { classifyMove } from "./camelot";
import { harmonicRisk, tonic } from "./risk";

const k = (code: string): Camelot => ({ num: Number(code.slice(0, -1)), letter: code.slice(-1) as Letter });
const all: Camelot[] = (["A", "B"] as const).flatMap((letter) => Array.from({ length: 12 }, (_, i) => ({ num: i + 1, letter })));

describe("tonic", () => {
  it("puts C major at 8B and A minor at 8A", () => {
    expect(tonic(k("8B"))).toBe(0);
    expect(tonic(k("8A"))).toBe(9);
    expect(tonic(k("9B"))).toBe(7); // G major
    expect(tonic(k("11B"))).toBe(9); // A major
  });
});

describe("harmonicRisk", () => {
  it("is 0 for the same key and the lowest of all moves from every key", () => {
    for (const a of all) {
      expect(harmonicRisk(a, a)).toBeCloseTo(0, 10);
      for (const b of all) if (classifyMove(a, b) && classifyMove(a, b) !== "same") expect(harmonicRisk(a, b)).toBeGreaterThan(0);
    }
  });

  it("is symmetric", () => {
    for (const a of all) for (const b of all) expect(harmonicRisk(a, b)).toBeCloseTo(harmonicRisk(b, a), 10);
  });

  it("rates close moves safer than semitone moves", () => {
    const from = k("8A");
    const semitone = Math.min(harmonicRisk(from, k("3A")), harmonicRisk(from, k("1A")));
    for (const close of ["9A", "7A", "8B"]) expect(harmonicRisk(from, k(close))).toBeLessThan(semitone);
  });

  it("stays within 0–1 for catalogue moves and reaches 1", () => {
    let max = 0;
    for (const a of all)
      for (const b of all)
        if (classifyMove(a, b)) {
          const r = harmonicRisk(a, b);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(1);
          max = Math.max(max, r);
        }
    expect(max).toBeCloseTo(1, 10);
  });
});
