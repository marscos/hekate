// Dev-only stand-in for the Rust backend, so the UI can run in a plain browser
// (`pnpm dev`) with a synthetic library. Never bundled into the app: it is
// imported dynamically only when `import.meta.env.DEV` and not inside Tauri.
//
// Scenarios via the URL: ?mock=ready (default) | notice | denied | notfound
// Simulate Mixxx starting a track from the console: __hekateMock.play(42)
// A script (e.g. a demo recorder) can supply a real library's metadata by
// setting `window.__hekateDemoLibrary` before the page loads.

import { emit } from "@tauri-apps/api/event";
import { mockIPC } from "@tauri-apps/api/mocks";
import type { Library, Track } from "$lib/library/types";

const MOCK_PATH = "/mock/Mixxx/mixxxdb.sqlite";

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function camelotOf(keyId: number) {
  if (keyId >= 1 && keyId <= 12) return { num: (((keyId - 1) * 7 + 7) % 12) + 1, letter: "B" as const };
  if (keyId >= 13 && keyId <= 24) return { num: (((keyId - 13) * 7 + 4) % 12) + 1, letter: "A" as const };
  return null;
}

export function syntheticLibrary(count = 640, seed = 11): Library {
  const rand = rng(seed);
  const tracks: Track[] = Array.from({ length: count }, (_, i) => {
    const keyId = rand() < 0.02 ? 0 : 1 + Math.floor(rand() * 24);
    // Cluster tempos like a real library: hip-hop/reggaeton, house, techno, DnB.
    const centres = [95, 100, 124, 128, 138, 174];
    const bpm = rand() < 0.01 ? 0 : Math.round((centres[Math.floor(rand() * centres.length)] + (rand() - 0.5) * 12) * 10) / 10;
    const camelot = camelotOf(keyId);
    return {
      id: i + 1,
      artist: `Artist ${1 + Math.floor(rand() * 120)}`,
      title: `Track ${i + 1}`,
      duration: 150 + Math.round(rand() * 150),
      bpm,
      keyId,
      camelot,
      usable: camelot !== null && bpm > 0,
    };
  });
  const crateNames = ["Bomb bomb", "Crate", "Love Shot", "Peak", "Tic tic", "Warmup", "Afters", "Classics"];
  const crates = crateNames.map((name, c) => ({
    id: c + 1,
    name,
    trackIds: tracks.filter((t) => (t.id * 7 + c * 13) % crateNames.length < 2).map((t) => t.id),
  }));
  const history = [12, 40, 77, 3].map((trackId, i) => ({ trackId, position: i + 1, playedAt: `2026-10-22 21:0${i}:00` }));
  return {
    path: MOCK_PATH,
    tracks,
    excludedCount: tracks.filter((t) => !t.usable).length,
    crates,
    histories: [{ playlistId: 9, name: "2026-10-22", entries: history }],
  };
}

export function install() {
  const scenario = new URLSearchParams(location.search).get("mock") ?? "ready";
  const injected = (window as unknown as { __hekateDemoLibrary?: Library }).__hekateDemoLibrary;
  const library = injected ?? syntheticLibrary();
  let granted = scenario === "ready";

  mockIPC(
    (cmd, payload) => {
      const args = (payload ?? {}) as Record<string, unknown>;
      switch (cmd) {
        case "library_access_info":
          return { needsAppDataPermission: scenario !== "ready" && scenario !== "notfound" };
        case "load_library":
        case "reload_library":
          if (scenario === "notfound") throw { kind: "notFound", searched: [MOCK_PATH] };
          if (scenario === "denied" && !granted) throw { kind: "permissionDenied", path: MOCK_PATH };
          return library;
        case "set_library_path": {
          const path = String(args.path);
          if (!path.endsWith(".sqlite")) throw { kind: "invalidLibrary", path, reason: "file is not a database" };
          granted = true;
          return { ...library, path };
        }
        case "plugin:dialog|open":
          return MOCK_PATH;
        default:
          console.warn("mock-ipc: unhandled command", cmd, args);
          return null;
      }
    },
    { shouldMockEvents: true },
  );

  const history = library.histories[0];
  (window as unknown as { __hekateMock: unknown }).__hekateMock = {
    library,
    play(trackId: number) {
      const position = history.entries.length + 1;
      history.entries = [...history.entries, { trackId, position, playedAt: new Date().toISOString() }];
      return emit("now-playing", { playlistId: history.playlistId, entries: history.entries });
    },
  };
}
