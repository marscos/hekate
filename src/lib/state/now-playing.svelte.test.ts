import { describe, expect, it } from "vitest";
import { NowPlayingState, type HistorySnapshot } from "./now-playing.svelte";

const snapshot = (playlistId: number, trackIds: number[]): HistorySnapshot => ({
  playlistId,
  entries: trackIds.map((trackId, i) => ({ trackId, position: i + 1, playedAt: `2026-10-22 21:0${i}:00` })),
});

describe("NowPlayingState", () => {
  it("follows the newest history row", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(5, [3, 1]));
    expect(s.trackId).toBe(1);
    expect(s.source).toBe("mixxx");
    s.applyHistory(snapshot(5, [3, 1, 2]));
    expect(s.trackId).toBe(2);
  });

  it("has no now-playing track when the history is empty", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(5, []));
    expect(s.trackId).toBeNull();
  });

  it("applies a manual choice immediately", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(5, [3, 1]));
    s.setManual(7);
    expect(s.trackId).toBe(7);
    expect(s.source).toBe("manual");
  });

  it("lets a newer history row replace a manual choice while following", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(5, [3, 1]));
    s.setManual(7);
    s.applyHistory(snapshot(5, [3, 1, 2]));
    expect(s.trackId).toBe(2);
  });

  it("keeps a manual choice when nothing new is recorded", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(5, [3, 1]));
    s.setManual(7);
    s.applyHistory(snapshot(5, [3, 1])); // same snapshot re-emitted
    expect(s.trackId).toBe(7);
  });

  it("ignores new history while following is off, but still tracks played tonight", () => {
    const s = new NowPlayingState(false);
    s.setManual(7);
    s.applyHistory(snapshot(5, [3, 1, 2]));
    expect(s.trackId).toBe(7);
    expect([...s.playedTonight]).toEqual([3, 1, 2]);
  });

  it("jumps to the latest recorded track when following is turned back on", () => {
    const s = new NowPlayingState(false);
    s.applyHistory(snapshot(5, [3, 1]));
    s.setManual(7);
    s.setFollow(true);
    expect(s.trackId).toBe(1);
  });

  it("derives played tonight from the latest history playlist", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(5, [3, 1]));
    expect(s.playedTonight.has(3)).toBe(true);
    expect(s.playedTonight.has(2)).toBe(false);
    s.applyHistory(snapshot(5, [3, 1, 2]));
    expect(s.playedTonight.has(2)).toBe(true);
    // A new history playlist (new session) starts a fresh set.
    s.applyHistory(snapshot(6, [9]));
    expect([...s.playedTonight]).toEqual([9]);
  });

  it("ignores the older history captured at load time after the poller moved on", () => {
    const s = new NowPlayingState(true);
    const atLoad = snapshot(13, [21]); // DESPERADO, from the loaded library
    s.applyHistory(atLoad);
    s.applyHistory(snapshot(13, [21, 7])); // Mixxx starts Turtle
    expect(s.trackId).toBe(7);
    s.applyHistory(atLoad); // re-applied later, e.g. when the pool changes
    expect(s.trackId).toBe(7);
    expect([...s.playedTonight]).toEqual([21, 7]);
  });

  it("ignores an older history playlist but accepts a newer one", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(snapshot(13, [21, 7]));
    s.applyHistory(snapshot(12, [1, 2, 3]));
    expect(s.trackId).toBe(7);
    s.applyHistory(snapshot(14, [9]));
    expect(s.trackId).toBe(9);
  });

  it("works manually when history is never available", () => {
    const s = new NowPlayingState(true);
    s.applyHistory(null);
    s.setManual(4);
    expect(s.trackId).toBe(4);
    expect(s.playedTonight.size).toBe(0);
  });
});
