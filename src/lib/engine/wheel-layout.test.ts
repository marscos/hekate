import { describe, expect, it } from "vitest";
import { RINGS, sectorAngle, wheelLayout } from "./wheel-layout";
import { syntheticTracks, track, unusable } from "./test-tracks";

const angleOf = (n: { x: number; y: number }) => Math.atan2(n.y, n.x);
const radiusOf = (n: { x: number; y: number }) => Math.hypot(n.x, n.y);
/** Smallest absolute difference between two angles. */
const angleDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe("wheelLayout", () => {
  it("puts 12 at the top and 3 to the right", () => {
    expect(sectorAngle(12)).toBeCloseTo(-Math.PI / 2, 10);
    expect(sectorAngle(3)).toBeCloseTo(0, 10);
  });

  it("places each track inside its key's sector", () => {
    const tracks = syntheticTracks(200);
    const { nodes } = wheelLayout(tracks);
    for (const t of tracks) expect(angleDiff(angleOf(nodes.get(t.id)!), sectorAngle(t.camelot!.num))).toBeLessThan(Math.PI / 12);
  });

  it("puts A keys on the inner ring and B keys on the outer ring", () => {
    const tracks = syntheticTracks(200);
    const { nodes } = wheelLayout(tracks);
    for (const t of tracks) {
      const [inner, outer] = RINGS[t.camelot!.letter];
      const r = radiusOf(nodes.get(t.id)!);
      expect(r).toBeGreaterThanOrEqual(inner - 1e-9);
      expect(r).toBeLessThanOrEqual(outer + 1e-9);
    }
  });

  it("moves faster tracks outwards within a ring", () => {
    const { nodes, bpmRange } = wheelLayout([track(1, "8A", 90), track(2, "8A", 130), track(3, "8B", 170)]);
    expect(bpmRange).toEqual([90, 170]);
    expect(radiusOf(nodes.get(2)!)).toBeGreaterThan(radiusOf(nodes.get(1)!));
    expect(radiusOf(nodes.get(1)!)).toBeCloseTo(RINGS.A[0], 10);
    expect(radiusOf(nodes.get(3)!)).toBeCloseTo(RINGS.B[1], 10);
  });

  it("is deterministic and independent of input order", () => {
    const tracks = syntheticTracks(100);
    const a = wheelLayout(tracks);
    const b = wheelLayout([...tracks].reverse());
    for (const t of tracks) expect(b.nodes.get(t.id)).toEqual(a.nodes.get(t.id));
  });

  it("skips unusable tracks", () => {
    expect(wheelLayout([track(1, "8A", 120), unusable(2)]).nodes.has(2)).toBe(false);
  });
});
