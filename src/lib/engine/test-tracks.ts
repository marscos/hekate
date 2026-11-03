// Track builders shared by engine tests.

import type { Letter, Track } from "$lib/library/types";

export function track(id: number, code: string, bpm: number, duration = 200): Track {
  const camelot = { num: Number(code.slice(0, -1)), letter: code.slice(-1) as Letter };
  return { id, artist: `Artist ${id}`, title: `Track ${id}`, duration, bpm, keyId: 1, camelot, usable: true };
}

export function unusable(id: number): Track {
  return { id, artist: "", title: `Raw ${id}`, duration: 200, bpm: 0, keyId: 0, camelot: null, usable: false };
}

/** Deterministic library shaped like a real one: ~650 tracks, 24 keys, 70–180 BPM. */
export function syntheticTracks(count = 650, seed = 3): Track[] {
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);
  return Array.from({ length: count }, (_, i) => {
    const code = `${1 + Math.floor(rand() * 12)}${rand() < 0.5 ? "A" : "B"}`;
    return track(i + 1, code, Math.round((70 + rand() * 110) * 10) / 10, 150 + Math.round(rand() * 150));
  });
}
