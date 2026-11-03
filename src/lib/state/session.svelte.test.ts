import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "$lib/library/types";
import { track } from "$lib/engine/test-tracks";
import { LibraryState } from "./library.svelte";
import { NowPlayingState } from "./now-playing.svelte";
import { Session } from "./session.svelte";

const library: Library = {
  path: "/m/mixxxdb.sqlite",
  tracks: [track(1, "8A", 100), track(2, "8A", 105), track(3, "8A", 110), track(4, "9A", 104), track(5, "2A", 100)],
  excludedCount: 0,
  crates: [{ id: 10, name: "Short", trackIds: [1, 2] }],
  histories: [],
};

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
});

function session() {
  const lib = new LibraryState();
  lib.library = library;
  lib.phase = "ready";
  return new Session(lib, new NowPlayingState(true));
}

describe("Session", () => {
  it("suggests compatible pool tracks for now-playing, excluding itself", () => {
    const s = session();
    s.setNowPlaying(1);
    expect(s.suggestions.map((x) => x.to).sort()).toEqual([2, 4]);
  });

  it("updates suggestions when the tolerance or pool changes", () => {
    const s = session();
    s.setNowPlaying(1);
    s.setTolerance(0.03);
    expect(s.suggestions).toHaveLength(0);
    s.setTolerance(0.06);
    s.pool.setSelected([10]);
    expect(s.suggestions.map((x) => x.to)).toEqual([2]);
  });

  it("routes to the request and follows it as now-playing advances", () => {
    const s = session();
    s.setNowPlaying(1);
    s.setRequest(3);
    expect(s.route?.kind === "route" && s.route.trackIds).toEqual([1, 2, 3]);
    s.setNowPlaying(2);
    expect(s.route?.kind === "route" && s.route.trackIds).toEqual([2, 3]);
    s.setNowPlaying(3);
    expect(s.route?.kind).toBe("reached");
    s.setRequest(null);
    expect(s.route).toBeNull();
  });

  it("remembers the tolerance", () => {
    session().setTolerance(0.04);
    expect(session().tolerance).toBe(0.04);
  });
});
