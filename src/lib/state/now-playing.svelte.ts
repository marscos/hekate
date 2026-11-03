import type { HistoryEntry } from "$lib/library/types";
import { readPreference, writePreference } from "./preferences";

const FOLLOW = "followMixxx";

/** Mixxx's latest history playlist, as emitted by the Rust poller. */
export interface HistorySnapshot {
  playlistId: number;
  /** In play order; the last entry is the track Mixxx started most recently. */
  entries: HistoryEntry[];
}

/**
 * Whether `next` is newer than `current`: a later history playlist (a new Mixxx
 * session), or the same playlist with rows added. Equal or older snapshots,
 * such as the history captured when the library was loaded, are stale.
 */
function isNewer(next: HistorySnapshot, current: HistorySnapshot | null) {
  if (!current) return true;
  if (next.playlistId !== current.playlistId) return next.playlistId > current.playlistId;
  const position = (s: HistorySnapshot) => s.entries.at(-1)?.position ?? 0;
  return position(next) > position(current) || next.entries.length > current.entries.length;
}

/**
 * The track hekate treats as playing (spec: now-playing).
 *
 * While following Mixxx, every newly recorded history row becomes now-playing,
 * replacing a manual choice. A manual choice holds until the next new row.
 */
export class NowPlayingState {
  trackId = $state<number | null>(null);
  source = $state<"mixxx" | "manual" | null>(null);
  follow = $state(true);
  history = $state<HistorySnapshot | null>(null);

  /** Tracks in the latest history playlist ("played tonight"). */
  playedTonight = $derived(new Set((this.history?.entries ?? []).map((e) => e.trackId)));

  constructor(follow = readPreference(FOLLOW, true)) {
    this.follow = follow;
  }

  /** Feeds a history snapshot (initial load or poller event). Duplicate and older snapshots are ignored. */
  applyHistory(snapshot: HistorySnapshot | null) {
    if (!snapshot || !isNewer(snapshot, this.history)) return;
    this.history = snapshot;
    const latest = snapshot.entries.at(-1);
    if (this.follow && latest) {
      this.trackId = latest.trackId;
      this.source = "mixxx";
    }
  }

  setManual(trackId: number) {
    this.trackId = trackId;
    this.source = "manual";
  }

  /** Turning following back on jumps to the latest track Mixxx recorded. */
  setFollow(follow: boolean) {
    this.follow = follow;
    writePreference(FOLLOW, follow);
    const latest = this.history?.entries.at(-1);
    if (follow && latest) {
      this.trackId = latest.trackId;
      this.source = "mixxx";
    }
  }
}
