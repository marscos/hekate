import { describe, expect, it, vi } from "vitest";
import { CoverStore } from "./covers.svelte";

const track = (id: number, coverDigest: string | null = `d${id}`) => ({ id, coverDigest });

/** A fetch whose answers the test releases by hand. */
function controlledFetch() {
  const pending: Array<{ trackId: number; resolve: (uri: string | null) => void; reject: (e: unknown) => void }> = [];
  const fetch = vi.fn(
    (trackId: number) => new Promise<string | null>((resolve, reject) => pending.push({ trackId, resolve, reject })),
  );
  return { fetch, pending };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("CoverStore", () => {
  it("returns null without asking for a track that has no cover", () => {
    const { fetch } = controlledFetch();
    const store = new CoverStore(fetch);
    expect(store.cover(track(1, null))).toBeNull();
    expect(store.cover(undefined)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("makes one request for concurrent calls with the same digest", async () => {
    const { fetch, pending } = controlledFetch();
    const store = new CoverStore(fetch);
    expect(store.cover(track(1))).toBeUndefined();
    expect(store.cover(track(1))).toBeUndefined();
    // A different track with the same cover shares it.
    expect(store.cover({ id: 2, coverDigest: "d1" })).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);

    pending[0].resolve("data:image/jpeg;base64,AA");
    await flush();
    expect(store.cover(track(1))).toBe("data:image/jpeg;base64,AA");
    expect(store.cover({ id: 2, coverDigest: "d1" })).toBe("data:image/jpeg;base64,AA");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("remembers a failure until the next reload", async () => {
    const { fetch, pending } = controlledFetch();
    const store = new CoverStore(fetch);
    store.cover(track(1));
    store.cover(track(2));
    pending[0].resolve(null);
    pending[1].reject(new Error("ipc"));
    await flush();
    expect(store.cover(track(1))).toBeNull();
    expect(store.cover(track(2))).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);

    store.clear();
    expect(store.cover(track(1))).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("a reload clears successes and ignores answers to earlier requests", async () => {
    const { fetch, pending } = controlledFetch();
    const store = new CoverStore(fetch);
    store.cover(track(1));
    pending[0].resolve("old");
    await flush();
    store.cover(track(2));

    store.clear();
    pending[1].resolve("stale");
    await flush();
    expect(store.cover(track(1))).toBeUndefined();
    expect(store.cover(track(2))).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
