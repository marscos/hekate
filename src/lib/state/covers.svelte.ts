import { trackCover } from "$lib/library/api";
import type { Track } from "$lib/library/types";
import { SvelteMap } from "svelte/reactivity";

export type FetchCover = (trackId: number) => Promise<string | null>;

/**
 * Cover thumbnails by digest (design D4). Each cover is requested once at a
 * time, and a failure is remembered until the next library load, so hovering
 * over a track on an unplugged drive doesn't retry endlessly.
 */
export class CoverStore {
  private results = new SvelteMap<string, string | null>();
  private inFlight = new Map<string, Promise<void>>();
  // Requests started before a clear() must not repopulate the store.
  private generation = 0;

  constructor(private fetchCover: FetchCover = trackCover) {}

  /**
   * The track's cover as a URI once loaded, `null` when it has none or it
   * can't be read, or `undefined` while it loads (this starts the request).
   */
  cover(track: Pick<Track, "id" | "coverDigest"> | undefined): string | null | undefined {
    const digest = track?.coverDigest;
    if (!track || !digest) return null;
    if (this.results.has(digest)) return this.results.get(digest);
    if (!this.inFlight.has(digest)) this.request(track.id, digest);
    return undefined;
  }

  /** Forgets every cover and failure; call when the library is (re)loaded. */
  clear() {
    this.generation++;
    this.inFlight.clear();
    this.results.clear();
  }

  private request(trackId: number, digest: string) {
    const generation = this.generation;
    const settle = (uri: string | null) => {
      if (generation !== this.generation) return;
      this.inFlight.delete(digest);
      this.results.set(digest, uri);
    };
    this.inFlight.set(
      digest,
      this.fetchCover(trackId).then(settle, () => settle(null)),
    );
  }
}
