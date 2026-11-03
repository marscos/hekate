import { describe, expect, it } from "vitest";
import type { Track } from "$lib/library/types";
import { findRoute, rerouteFrom, type RouteRequest } from "./router";
import { track, unusable } from "./test-tracks";

function request(tracks: Track[], currentId: number, targetId: number, extra: Partial<RouteRequest> = {}): RouteRequest {
  return {
    tracks: new Map(tracks.map((t) => [t.id, t])),
    poolIds: new Set(tracks.map((t) => t.id)),
    currentId,
    targetId,
    playedTonight: new Set(),
    tolerance: 0.06,
    ...extra,
  };
}

const ids = (r: ReturnType<typeof findRoute>) => (r.kind === "route" ? r.trackIds : r.kind);

// A tempo ladder: 100 → 105 → 110 → 115 → 120 in 8A, plus a lone 140 BPM track.
const ladder = [track(1, "8A", 100), track(2, "8A", 105, 180), track(3, "8A", 110, 240), track(4, "8A", 115), track(5, "8A", 120), track(6, "8A", 140)];

describe("findRoute", () => {
  it("goes straight to a directly compatible target", () => {
    expect(ids(findRoute(request(ladder, 1, 2)))).toEqual([1, 2]);
  });

  it("uses the fewest intermediate tracks", () => {
    expect(ids(findRoute(request(ladder, 1, 5)))).toEqual([1, 2, 3, 4, 5]);
  });

  it("prefers the lower-risk route among equally short ones", () => {
    // 120 → 124 is 3.3%, over the 2% tolerance, so one step is needed: through
    // 9A (two ±1 moves) or 3A (two semitone moves). 9A is safer.
    const tracks = [track(1, "8A", 120), track(2, "3A", 122), track(3, "9A", 122), track(4, "10A", 124)];
    expect(ids(findRoute(request(tracks, 1, 4, { tolerance: 0.02 })))).toEqual([1, 3, 4]);
  });

  it("estimates the time until the target starts from intermediate durations", () => {
    const r = findRoute(request(ladder, 1, 4));
    expect(r.kind === "route" && r.estimatedSeconds).toBe(180 + 240);
  });

  it("never routes through tracks played tonight", () => {
    // 120 → 130 needs one step, through track 2 or track 4.
    const tracks = [track(1, "8A", 120), track(2, "9A", 126), track(3, "10A", 130), track(4, "9A", 125)];
    expect(ids(findRoute(request(tracks, 1, 3)))).toHaveLength(3);
    expect(ids(findRoute(request(tracks, 1, 3, { playedTonight: new Set([4]) })))).toEqual([1, 2, 3]);
    expect(ids(findRoute(request(tracks, 1, 3, { playedTonight: new Set([2]) })))).toEqual([1, 4, 3]);
    expect(findRoute(request(tracks, 1, 3, { playedTonight: new Set([2, 4]) })).kind).toBe("none");
  });

  it("only uses pool tracks as intermediates but accepts any target", () => {
    const pool = new Set([1, 2]);
    expect(ids(findRoute(request(ladder, 1, 3, { poolIds: pool })))).toEqual([1, 2, 3]);
    expect(findRoute(request(ladder, 1, 4, { poolIds: pool })).kind).toBe("none");
  });

  it("reports when no route exists", () => {
    expect(findRoute(request(ladder, 1, 6)).kind).toBe("none");
    expect(findRoute(request([...ladder, unusable(7)], 1, 7)).kind).toBe("none");
  });

  it("is reached when the target is playing", () => {
    expect(findRoute(request(ladder, 3, 3)).kind).toBe("reached");
  });
});

describe("rerouteFrom", () => {
  const first = findRoute(request(ladder, 1, 5));

  it("continues from the next track when the DJ follows the route", () => {
    expect(ids(rerouteFrom(first, request(ladder, 2, 5)))).toEqual([2, 3, 4, 5]);
  });

  it("routes again when the DJ leaves the route", () => {
    const tracks = [...ladder, track(7, "9A", 106)];
    const off = rerouteFrom(first, request(tracks, 7, 5));
    expect(ids(off)[0]).toBe(7);
    expect(ids(off).at(-1)).toBe(5);
  });

  it("routes again when the request changes, even if the track is on the old route", () => {
    expect(ids(rerouteFrom(first, request(ladder, 2, 4)))).toEqual([2, 3, 4]);
  });

  it("marks the request reached when the target starts", () => {
    expect(rerouteFrom(first, request(ladder, 5, 5)).kind).toBe("reached");
  });
});
