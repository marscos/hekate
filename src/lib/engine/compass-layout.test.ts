import { describe, expect, it } from "vitest";
import { compassLayout, radiusFor } from "./compass-layout";
import { rankSuggestions } from "./ranking";
import { track } from "./test-tracks";
import { transitionsFrom } from "./transition";

const current = track(1, "8A", 125);
const layoutFor = (candidates: ReturnType<typeof track>[], cap?: number) =>
  compassLayout(rankSuggestions(transitionsFrom(current, candidates, 0.06), new Set(), 0.06), cap);
const nodeOf = (l: ReturnType<typeof compassLayout>, id: number) => l.nodes.find((n) => n.suggestion.to === id)!;

describe("compassLayout", () => {
  it("puts major targets on the right and minor targets on the left", () => {
    const l = layoutFor([track(2, "8B", 125), track(3, "9A", 125)]);
    expect(nodeOf(l, 2).x).toBeGreaterThan(0);
    expect(nodeOf(l, 3).x).toBeLessThan(0);
  });

  it("places riskier moves further from the centre", () => {
    const l = layoutFor([track(2, "9A", 125), track(3, "3A", 125)]);
    const dist = (id: number) => Math.hypot(nodeOf(l, id).x, nodeOf(l, id).y);
    expect(dist(3)).toBeGreaterThan(dist(2));
    expect(dist(2)).toBeCloseTo(radiusFor(nodeOf(l, 2).suggestion.risk), 10);
  });

  it("puts clockwise moves above the axis and counter-clockwise below", () => {
    const l = layoutFor([track(2, "9A", 125), track(3, "7A", 125)]);
    expect(nodeOf(l, 2).y).toBeLessThan(0);
    expect(nodeOf(l, 3).y).toBeGreaterThan(0);
  });

  it("keeps the same key and the relative key on the horizontal axis", () => {
    const l = layoutFor([track(2, "8A", 125), track(3, "8B", 125)]);
    expect(nodeOf(l, 2).y).toBeCloseTo(0, 10);
    expect(nodeOf(l, 3).y).toBeCloseTo(0, 10);
  });

  it("orders a slot by BPM gap, smallest at the slot centre", () => {
    const l = layoutFor([track(2, "9A", 129), track(3, "9A", 125.5), track(4, "9A", 127)]);
    expect([2, 3, 4].map((id) => nodeOf(l, id).rank)).toEqual([2, 0, 1]);
    const slot = l.slots.find((s) => s.key === nodeOf(l, 3).slot)!;
    expect(nodeOf(l, 3).x).toBeCloseTo(slot.x, 10);
    expect(nodeOf(l, 3).y).toBeCloseTo(slot.y, 10);
  });

  it("caps a crowded slot and reports the overflow", () => {
    const crowd = Array.from({ length: 11 }, (_, i) => track(10 + i, "9A", 125 + i * 0.3));
    const l = layoutFor(crowd, 8);
    expect(l.nodes).toHaveLength(8);
    expect(l.slots[0].overflow).toBe(3);
    // The smallest gaps are the ones kept.
    expect(l.nodes.map((n) => n.suggestion.to).sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it("labels slots with their move and any DJ convention", () => {
    const l = layoutFor([track(2, "10A", 125)]);
    expect(l.slots[0].label).toBe("+2 · +2 energy boost");
  });

  it("returns identical output for identical input", () => {
    const candidates = [track(2, "9A", 126), track(3, "8B", 124), track(4, "3A", 125), track(5, "9A", 127)];
    expect(layoutFor(candidates)).toEqual(layoutFor([...candidates].reverse()));
  });
});
