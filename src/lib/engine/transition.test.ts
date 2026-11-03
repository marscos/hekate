import { describe, expect, it } from "vitest";
import { classifyMove } from "./camelot";
import { matchBpm } from "./bpm";
import { harmonicRisk } from "./risk";
import { buildGraph, describeTransition } from "./transition";
import { syntheticTracks, track, unusable } from "./test-tracks";

describe("describeTransition", () => {
  it("requires both a key move and a BPM match", () => {
    expect(describeTransition(track(1, "8A", 100), track(2, "9A", 125), 0.06)).toBeNull();
    expect(describeTransition(track(1, "8A", 125), track(2, "2A", 125), 0.06)).toBeNull();
    expect(describeTransition(track(1, "8A", 125), track(2, "9A", 126), 0.06)).not.toBeNull();
  });

  it("describes mood by the target mode", () => {
    expect(describeTransition(track(1, "8A", 125), track(2, "8B", 125), 0.06)!.mood).toBe("brighter");
    expect(describeTransition(track(1, "8A", 125), track(2, "9A", 125), 0.06)!.mood).toBe("darker");
  });

  it("labels DJ conventions without changing risk or mood", () => {
    const boost = describeTransition(track(1, "8A", 125), track(2, "10A", 125), 0.06)!;
    expect(boost.label).toBe("+2 energy boost");
    expect(boost.risk).toBe(harmonicRisk({ num: 8, letter: "A" }, { num: 10, letter: "A" }));
    expect(boost.mood).toBe("darker");
    expect(describeTransition(track(1, "8A", 125), track(2, "3A", 125), 0.06)!.label).toBe("semitone lift");
    expect(describeTransition(track(1, "8A", 125), track(2, "9A", 125), 0.06)!.label).toBeUndefined();
  });

  it("skips unusable tracks and the track itself", () => {
    expect(describeTransition(track(1, "8A", 125), unusable(2), 0.06)).toBeNull();
    expect(describeTransition(track(1, "8A", 125), track(1, "8A", 125), 0.06)).toBeNull();
  });
});

describe("buildGraph", () => {
  it("finds exactly the pairs a brute-force comparison finds", () => {
    const tracks = [...syntheticTracks(200, 9), unusable(999)];
    const graph = buildGraph(tracks, 0.06);
    let brute = 0;
    for (const a of tracks)
      for (const b of tracks)
        if (a.id !== b.id && a.usable && b.usable && classifyMove(a.camelot!, b.camelot!) && matchBpm(a.bpm, b.bpm, 0.06)) brute++;
    const edges = [...graph.values()].reduce((n, out) => n + out.length, 0);
    expect(edges).toBe(brute);
    expect(graph.has(999)).toBe(false);
  });

  it("builds a library-sized graph in under 50 ms", () => {
    const tracks = syntheticTracks(650);
    buildGraph(tracks, 0.06); // warm up the JIT
    const start = performance.now();
    buildGraph(tracks, 0.06);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
