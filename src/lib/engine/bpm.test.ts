import { describe, expect, it } from "vitest";
import { matchBpm } from "./bpm";

describe("matchBpm", () => {
  it("accepts tempos within the default ±6%", () => {
    const m = matchBpm(124, 128);
    expect(m).not.toBeNull();
    expect(m!.gapPct).toBeCloseTo(3.23, 2);
    expect(m!.halfDouble).toBe(false);
  });

  it("rejects tempos outside the tolerance", () => {
    expect(matchBpm(120, 130)).toBeNull();
  });

  it("uses a narrower tolerance when given", () => {
    expect(matchBpm(124, 128, 0.03)).toBeNull();
    expect(matchBpm(125, 126, 0.03)).not.toBeNull();
  });

  it("matches half and double time and flags it", () => {
    const m = matchBpm(87, 174);
    expect(m).toEqual({ gapPct: 0, halfDouble: true });
    expect(matchBpm(174, 86)!.halfDouble).toBe(true);
  });

  it("reports a signed gap relative to the current track", () => {
    expect(matchBpm(125, 126)!.gapPct).toBeCloseTo(0.8, 5);
    expect(matchBpm(125, 121)!.gapPct).toBeCloseTo(-3.2, 5);
  });

  it("ignores tracks without a tempo", () => {
    expect(matchBpm(0, 120)).toBeNull();
    expect(matchBpm(120, 0)).toBeNull();
  });
});
