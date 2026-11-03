import { describe, expect, it } from "vitest";
import { rankSuggestions } from "./ranking";
import type { Transition } from "./transition";

const t = (to: number, risk: number, gapPct: number): Transition => ({
  from: 0,
  to,
  move: "up1",
  direction: 1,
  risk,
  mood: "darker",
  gapPct,
  halfDouble: false,
});

describe("rankSuggestions", () => {
  it("ranks lower risk first when the BPM gap is equal", () => {
    expect(rankSuggestions([t(1, 0.5, 2), t(2, 0.2, 2)], new Set(), 0.06).map((s) => s.to)).toEqual([2, 1]);
  });

  it("ranks the smaller BPM gap first when risk is equal", () => {
    expect(rankSuggestions([t(1, 0.3, -4), t(2, 0.3, 1)], new Set(), 0.06).map((s) => s.to)).toEqual([2, 1]);
  });

  it("weighs risk and BPM gap equally relative to the tolerance", () => {
    // 3% of a 6% tolerance counts as 0.5, the same as a risk of 0.5.
    const [a, b] = rankSuggestions([t(1, 0.5, 0), t(2, 0, 3)], new Set(), 0.06);
    expect(a.score).toBeCloseTo(b.score, 10);
  });

  it("sorts by BPM gap or risk on request", () => {
    const list = [t(1, 0.1, 5), t(2, 0.9, -1), t(3, 0.5, 2)];
    expect(rankSuggestions(list, new Set(), 0.06, "bpm").map((s) => s.to)).toEqual([2, 3, 1]);
    expect(rankSuggestions(list, new Set(), 0.06, "risk").map((s) => s.to)).toEqual([1, 3, 2]);
  });

  it("puts played-tonight tracks after every unplayed one", () => {
    const ranked = rankSuggestions([t(1, 0, 0), t(2, 0.9, 5), t(3, 0.4, 1)], new Set([1]), 0.06);
    expect(ranked.map((s) => s.to)).toEqual([3, 2, 1]);
    expect(ranked[2].playedTonight).toBe(true);
  });
});
