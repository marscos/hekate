// Payloads returned by the Rust library commands (src-tauri/src/mixxx/library.rs).

export type Letter = "A" | "B";

export interface Camelot {
  num: number;
  letter: Letter;
}

export interface Track {
  id: number;
  artist: string;
  title: string;
  duration: number;
  bpm: number;
  keyId: number;
  camelot: Camelot | null;
  /** Has a known key and a positive BPM. */
  usable: boolean;
}

export interface Crate {
  id: number;
  name: string;
  trackIds: number[];
}

export interface HistoryEntry {
  trackId: number;
  position: number;
  playedAt: string;
}

export interface History {
  playlistId: number;
  name: string;
  entries: HistoryEntry[];
}

export interface Library {
  path: string;
  tracks: Track[];
  excludedCount: number;
  crates: Crate[];
  /** Newest first. */
  histories: History[];
}

export type LibraryError =
  | { kind: "notFound"; searched: string[] }
  | { kind: "permissionDenied"; path: string }
  | { kind: "invalidLibrary"; path: string; reason: string }
  | { kind: "read"; path: string; reason: string };

export interface AccessInfo {
  needsAppDataPermission: boolean;
}
