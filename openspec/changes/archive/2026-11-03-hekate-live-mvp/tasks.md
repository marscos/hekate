# Tasks

## 1. Tooling and rendering spike

- [x] 1.1 Add Tailwind v4 and initialise shadcn-svelte (bits-ui) with a dark default theme and a font bundled from npm. Verify `pnpm check` passes and a shadcn Button renders in `pnpm tauri dev`.
- [x] 1.2 Add Vitest with a `pnpm test` script. Verify a placeholder unit test runs and passes.
- [x] 1.3 Add `@unovis/ts` (not `@unovis/svelte`) and write a thin Svelte 5 graph component that creates the container on mount, updates data/config from an `$effect`, and destroys it on unmount (D13). Verify a demo graph with precalculated node positions renders and updates without console errors.
- [x] 1.4 Spike SVG performance with a synthetic dataset shaped like the user's library (~650 tracks across 24 keys, 70–180 BPM): render the wheel map with all nodes plus a 9-step route overlay, and the compass with ~8 nodes per slot. Verify that updates after a data change apply in under ~100 ms and hover stays smooth. Record the result and the keep-unovis or sigma.js-fallback decision in design.md D13.

## 2. App shell and offline hardening

- [x] 2.1 Set `tauri.conf.json` CSP to `default-src 'self'` (plus only the local schemes Tauri needs) and enlarge the default window for a dedicated monitor. Verify that a deliberate `<img src="https://...">` in a dev build is blocked by the CSP (console shows the violation).
- [x] 2.2 Remove `tauri-plugin-opener` (Rust crate, npm package, capability entries and template usage) and restrict capabilities to hekate's own commands. Verify `pnpm tauri build` succeeds and `grep -r opener src src-tauri/src src-tauri/capabilities` finds nothing.
- [x] 2.3 Replace the template page with an empty three-region layout (top bar, compass | wheel map, bottom list) built from shadcn components (D14). Verify it renders in `pnpm tauri dev` at full-monitor size without scrollbars.
- [x] 2.4 Document the offline guarantee and the no-network policy in README.md. Verify that README no longer contains template text.

## 3. Mixxx library reader (Rust)

- [x] 3.1 Add `rusqlite` and a test helper that builds a minimal Mixxx-schema SQLite fixture (`library`, `track_locations`, `crates`, `crate_tracks`, `Playlists`, `PlaylistTracks`) with mixed key notations, deleted tracks and unanalysed tracks. Verify `cargo test` runs a fixture smoke test.
- [x] 3.2 Implement library location: probe the default paths for macOS (sandboxed and non-sandboxed), Linux and Windows, then fall back to a persisted manually chosen path (D16). Verify with unit tests over the candidate list and persisted-path precedence.
- [x] 3.3 Implement read-only opening (`mode=ro`) with a busy timeout and a retry. Verify with tests that the fixture file's checksum is unchanged after a full load, and that a load completes after another connection releases a held write lock.
- [x] 3.4 Implement track loading with Camelot from `key_id` (D3), excluding deleted tracks and counting tracks with no key or BPM as excluded. Verify with tests: all 24 `key_id`s map correctly (e.g. 1→8B, 13→5A, 21→1A), mixed `key` text is ignored, deleted tracks are absent, and the excluded count is correct.
- [x] 3.5 Implement loading crates (with members) and history playlists (`hidden = 2`, in play order, with timestamps). Verify with fixture tests for crate membership and history ordering.
- [x] 3.6 Expose the Tauri commands `load_library`, `reload_library` and `set_library_path`, returning the normalised track, crate and history payload, and reject non-Mixxx files with a clear error. Verify with Rust tests for the invalid-file error, and by calling `load_library` from the dev UI against the fixture.
- [x] 3.7 Build the first-run flow: explain the macOS "access data from other apps" prompt before the first read, handle denial with guidance, and offer a file picker (local dialog plugin, no network). Verify manually on macOS under a user account that has not granted hekate access: the explanation appears first, denial shows guidance, and picking the file loads the library.
- [x] 3.8 Show library status in the UI: number of loaded tracks, excluded count, a reload button and load errors. Document library discovery and the macOS permission prompt in README.md. Verify that reloading after editing a crate in Mixxx shows the change.

## 4. Now-playing

- [x] 4.1 Implement a Rust poller (~1 s) that reads the newest row of the latest history playlist and emits a `now-playing` event only when it changes, tolerating a locked database. Verify with a test that inserts a history row into the fixture and receives the event within 2 s, and gets no event when nothing changes.
- [x] 4.2 Implement the frontend now-playing state: a Follow Mixxx toggle, a manual override that takes effect immediately, newer history rows replacing a manual choice while following, and no changes while following is off. Verify with unit tests covering each scenario in `specs/now-playing`.
- [x] 4.3 Derive the played-tonight set from the latest history playlist and keep it updated with new rows. Verify with unit tests, and that manual selection keeps working when history is unreadable.

## 5. Transition engine (pure TypeScript)

- [x] 5.1 Implement the Camelot types and the move classifier for the D5 catalogue. Verify with unit tests for every scenario in `specs/transition-compatibility` (adjacent, relative, both diagonals, semitone, parallel, unrelated).
- [x] 5.2 Implement BPM compatibility with an adjustable tolerance (default 0.06), half/double-time detection and a signed percentage gap (D7). Verify with tests: 124/128 passes, 120/130 fails at ±6%, 87/174 passes and is flagged.
- [x] 5.3 Implement the 24×24 Krumhansl–Kessler risk table normalised to 0..1 over the catalogue's moves (D6). Verify with tests: same key is lowest from every key, the table is symmetric, and from 8A the moves +1, −1 and relative are below both semitone moves.
- [x] 5.4 Implement the mood effect (target mode: major is "brighter", minor is "darker") and convention labels ("+2 energy boost", "semitone lift"). Verify with unit tests that labels never change risk or mood.
- [x] 5.5 Implement the graph builder over a pool and tolerance, bucketed by key, excluding unusable tracks. Verify with a test that the edge count on a known fixture matches a brute-force count, and that a synthetic library of ~650 tracks builds in under 50 ms.
- [x] 5.6 Implement the next-up ranking (combined score from D8, column sorts, played-tonight tracks sorted last). Verify with unit tests for the equal-gap and equal-risk scenarios and the ordering of played tracks.
- [x] 5.7 Implement the router: cost `1 + ε·risk`, intermediates from the pool only, excluding played and current tracks, no repeats, any library track as the target, no-route detection, and route trimming/rerouting/reached on a now-playing change (D10). Verify with unit tests for every scenario in `specs/request-routing` except the map.

## 6. Track pool

- [x] 6.1 Implement the pool state: the whole library by default, a union of selected crates, a usable-track count, and selections persisted across restarts with missing crates dropped. Verify with unit tests for each scenario in `specs/track-pool`.
- [x] 6.2 Build the pool picker in the top bar (multi-select crates showing the pool size). Verify in `pnpm tauri dev` that changing crates updates the pool size, the list and the compass.

## 7. Views

- [x] 7.1 Build the top bar: now-playing display, track search to set now-playing, the Follow Mixxx toggle and the BPM tolerance control, with keyboard shortcuts (focus search, set now-playing, set request target). Verify each shortcut, and that changing the tolerance updates every view.
- [x] 7.2 Build the next-up list: columns per `specs/next-track-suggestions`, default ranking, column sorting, dimmed played tracks, empty and no-compatible states with a "widen tolerance" action, and actions to set as now-playing or as the request target. Verify with component tests for ordering and empty states, plus a manual check in the app.
- [x] 7.3 Implement the compass layout as a pure function: side by target mode, radius increasing with risk, angle by wheel direction, fixed slots, BPM-gap ordering within a slot, and a per-slot cap with an overflow count. Verify with unit tests for each layout scenario in `specs/transition-compass`, including identical output for identical input.
- [x] 7.4 Render the compass through the unovis component: risk rings, darker/brighter labels, convention badges, dimmed played tracks, hover details and linked selection with the next-up list. Tune the ring thresholds and the per-slot cap against the real risk table. Verify visually in the app, and record the chosen values in design.md Open Questions.
- [x] 7.5 Implement the wheel map layout as a pure function (24 sectors, A inner and B outer rings, BPM radius within a ring band; the target is included even when outside the pool). Verify with unit tests for determinism and placement by sector and ring.
- [x] 7.6 Render the wheel map with the route overlay, highlighted now-playing and target, and the route summary panel (ordered steps with move and BPM gap, track count, estimated time from durations), plus request search and clear. Verify in the app that a request shows a route, following it trims the route, leaving it reroutes, and reaching it clears the route.

## 8. Integration checks

- [x] 8.1 Run against the user's real Mixxx library with Mixxx open: confirm all usable tracks load, now-playing follows tracks played in Mixxx within about 2 s, and suggestions, the compass and routes update. Repeat the 1.4 performance check on the real data.
- [x] 8.2 Offline check, by audit (the user waived a session with networking disabled, since offline operation follows from the build): verify the source has no network calls (no fetch/XHR/WebSocket in TypeScript, no networking crates or `std::net` in Rust), the only plugin is the local file dialog, the built bundle has no remote resource references (only namespace and comment URLs), the CSP blocks remote origins (verified in 2.1), and a 4-minute socket watch of the running app and its WebKit networking process shows no connections.
- [x] 8.3 Library safety check: with Mixxx closed, checksum `mixxxdb.sqlite`, run a full hekate session, and checksum again. Verify the checksums match and no new files appear in the Mixxx folder.

## Workflow follow-up

- Archive the change after review once all tasks are done.
- Verify the archived specs under `openspec/specs/` match the eight capabilities.
