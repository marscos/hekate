import { DEFAULT_TOLERANCE } from "$lib/engine/bpm";
import { rankSuggestions, type Suggestion, type SuggestionSort } from "$lib/engine/ranking";
import { rerouteFrom, type RouteResult } from "$lib/engine/router";
import { transitionsFrom, type Transition } from "$lib/engine/transition";
import type { Track } from "$lib/library/types";
import { LibraryState } from "./library.svelte";
import { NowPlayingState } from "./now-playing.svelte";
import { PoolState } from "./pool.svelte";
import { readPreference, writePreference } from "./preferences";

const TOLERANCE = "bpmTolerance";

/** Everything the views share: inputs, and the suggestions and route derived from them. */
export class Session {
  library: LibraryState;
  nowPlaying: NowPlayingState;
  pool: PoolState;

  tolerance = $state(readPreference(TOLERANCE, DEFAULT_TOLERANCE));
  sort = $state<SuggestionSort>("best");
  /** Track highlighted in both the compass and the next-up list. */
  selectedId = $state<number | null>(null);
  requestId = $state<number | null>(null);

  current: Track | undefined;
  request: Track | undefined;
  poolTracks: Track[];
  /** The pool plus the current and requested tracks, which may lie outside it. */
  wheelTracks: Track[];
  transitions: Transition[];
  suggestions: Suggestion[];
  route: RouteResult | null;

  // Rerouting continues an existing route when now-playing moves along it.
  private lastRoute: RouteResult | null = null;

  constructor(library = new LibraryState(), nowPlaying = new NowPlayingState()) {
    this.library = library;
    this.nowPlaying = nowPlaying;
    this.pool = new PoolState(() => this.library.library);

    this.current = $derived(this.trackById(this.nowPlaying.trackId));
    this.request = $derived(this.trackById(this.requestId));
    this.poolTracks = $derived(
      [...this.pool.ids].map((id) => this.library.tracksById.get(id)).filter((t): t is Track => t !== undefined),
    );
    this.wheelTracks = $derived.by(() => {
      const extra = [this.current, this.request].filter((t): t is Track => t !== undefined && !this.pool.ids.has(t.id));
      return [...this.poolTracks, ...new Map(extra.map((t) => [t.id, t])).values()];
    });
    this.transitions = $derived(this.current ? transitionsFrom(this.current, this.poolTracks, this.tolerance) : []);
    this.suggestions = $derived(rankSuggestions(this.transitions, this.nowPlaying.playedTonight, this.tolerance, this.sort));
    this.route = $derived.by((): RouteResult | null => {
      const current = this.current;
      const target = this.request;
      if (!current || !target) return (this.lastRoute = null);
      return (this.lastRoute = rerouteFrom(this.lastRoute, {
        tracks: this.library.tracksById,
        poolIds: this.pool.ids,
        currentId: current.id,
        targetId: target.id,
        playedTonight: this.nowPlaying.playedTonight,
        tolerance: this.tolerance,
      }));
    });
  }

  private trackById(id: number | null) {
    return id === null ? undefined : this.library.tracksById.get(id);
  }

  setTolerance(tolerance: number) {
    this.tolerance = tolerance;
    writePreference(TOLERANCE, tolerance);
  }

  setNowPlaying(trackId: number) {
    this.nowPlaying.setManual(trackId);
  }

  setRequest(trackId: number | null) {
    this.requestId = trackId;
  }
}
