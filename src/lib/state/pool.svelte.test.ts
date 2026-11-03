import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "$lib/library/types";
import { track, unusable } from "$lib/engine/test-tracks";
import { PoolState, computePool } from "./pool.svelte";

const library: Library = {
  path: "/m/mixxxdb.sqlite",
  tracks: [track(1, "8A", 120), track(2, "9A", 122), track(3, "8B", 124), track(4, "1A", 90), unusable(5)],
  excludedCount: 1,
  crates: [
    { id: 10, name: "D", trackIds: [1, 2, 5] },
    { id: 11, name: "E", trackIds: [2, 3] },
  ],
  histories: [],
};

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
});

describe("computePool", () => {
  it("is every usable track when no crates are selected", () => {
    expect([...computePool(library, [])].sort()).toEqual([1, 2, 3, 4]);
  });

  it("is the union of the selected crates' usable tracks, each once", () => {
    expect([...computePool(library, [10, 11])].sort()).toEqual([1, 2, 3]);
    expect([...computePool(library, [10])].sort()).toEqual([1, 2]);
  });

  it("is empty without a library", () => {
    expect(computePool(null, []).size).toBe(0);
  });
});

describe("PoolState", () => {
  it("remembers the selection across restarts", () => {
    const a = new PoolState(() => library);
    a.toggle(10);
    a.toggle(11);
    const b = new PoolState(() => library);
    expect(b.selected).toEqual([10, 11]);
    expect(b.ids.size).toBe(3);
  });

  it("drops crates that no longer exist and keeps the rest", () => {
    const s = new PoolState(() => library, [10, 99]);
    s.prune(library);
    expect(s.selected).toEqual([10]);
    expect(new PoolState(() => library).selected).toEqual([10]);
  });

  it("updates its size when the selection changes", () => {
    const s = new PoolState(() => library, []);
    expect(s.ids.size).toBe(4);
    s.setSelected([11]);
    expect(s.ids.size).toBe(2);
  });
});
