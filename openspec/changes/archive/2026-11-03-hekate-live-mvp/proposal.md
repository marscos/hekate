# Proposal

## Why

Mid-set, a DJ has seconds to pick the next track, and finding harmonically compatible options in a flat library list means mentally walking the Camelot wheel while also matching BPM. hekate turns a Mixxx library into a live, offline assistant. It shows which tracks can follow the one playing, how each move changes the atmosphere, and how to reach a requested song through smooth transitions.

## What Changes

- New Tauri + Svelte 5 desktop app built on the existing scaffold. It runs fully offline and is meant for a dedicated monitor next to Mixxx.
- Reads the user's Mixxx library **read-only**: tracks (BPM, canonical key), crates and history playlists. hekate never writes to Mixxx's database.
- Detects the track that is playing from Mixxx's history playlist, with a manual override that works on its own when detection is unavailable.
- Models transitions between tracks: Camelot moves (same key, ±1, relative, diagonal, ±2, semitone up/down, parallel), a BPM tolerance (default ±6%, adjustable, half/double-time aware), and a harmonic risk score based on Krumhansl key-profile distance. Keylock is assumed always on.
- **Next-up list**: ranked compatible tracks with BPM gap, key move and risk. Tracks already played tonight are dimmed.
- **Transition compass**: a fixed-layout focus graph around the current track. Left/right shows the target mode (darker/brighter), radius shows harmonic risk, and angle shows direction on the wheel. DJ conventions (e.g. "+2 energy boost") appear as labelled badges.
- **Request routing**: the fewest-tracks path from the current track to a requested one, drawn on a Camelot-wheel map and recomputed whenever the track that is playing changes.
- **Track pool**: one or more Mixxx crates can limit suggestions and routes to tonight's pool.
- UI built with shadcn-svelte. The compass is rendered with unovis (`@unovis/ts`). The wheel map is plain SVG, because a rendering spike showed unovis too slow at ~650 nodes (see design D13).

Out of scope for this change (roadmap): blend-aware risk from intro/outro audio analysis (HPSS), alternative route strategies (smooth vs fast, arrive within N tracks), a whole-library wheel view for prep, user ratings of transitions, hotcues as mix points, keylock-off pitch/key shift, and non-Mixxx sources.

## Capabilities

### New Capabilities
- `mixxx-library-import`: Locating and reading a Mixxx library read-only. Covers tracks with BPM and canonical key (from `key_id`, not the notation-dependent `key` text), crates, history playlists, deleted/unanalysed track handling, and the macOS permission flow for Mixxx's sandboxed folder.
- `now-playing`: Determining the current track from Mixxx's history playlist by polling, the manual override, and the "played tonight" set.
- `transition-compatibility`: The rules relating two tracks. Covers the Camelot move catalogue, BPM tolerance with half/double time, harmonic risk (Krumhansl key-profile distance), the mood effect of each move (target mode), and convention labels.
- `next-track-suggestions`: The ranked next-up list for the current track. Covers ordering, the displayed attributes and played-tonight treatment.
- `transition-compass`: The focus graph around the current track and its deterministic layout and encodings. Covers mode side, risk radius, wheel-direction angle, badges, and linked selection with the next-up list.
- `request-routing`: Finding the fewest-tracks route to a requested track, rerouting when the track that is playing changes, and showing the route on the Camelot-wheel map.
- `track-pool`: Choosing which Mixxx crates (or the whole library) supply candidates for suggestions and routes.
- `offline-operation`: The guarantee that the app works with no network access and makes no network requests. Covers bundled assets and a strict CSP.

### Modified Capabilities
<!-- None: no existing specs. -->

## Impact

- **Code**: replaces the template UI in `src/` with the hekate app. Adds Rust modules in `src-tauri/src/` for Mixxx access and now-playing polling, exposed as Tauri commands and events.
- **Dependencies**:
  - Frontend: `@unovis/ts` (not `@unovis/svelte`, whose peer dependency is Svelte 4), shadcn-svelte with bits-ui and Tailwind v4.
  - Rust: `rusqlite` (read-only).
  - No network-capable plugins.
- **Configuration**: `tauri.conf.json` gets a strict CSP (currently `null`), a larger default window, and capabilities scoped to the commands hekate exposes.
- **External systems**: reads Mixxx's SQLite database (e.g. `~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/mixxxdb.sqlite` on macOS) and must tolerate Mixxx running and writing to it at the same time.
- **Risks to retire early**: unovis integration with Svelte 5, SVG rendering performance on a ~600-track wheel with a route overlay, and the macOS "access data from other apps" prompt on first run.
