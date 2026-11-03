# Design

## Context

See proposal.md for motivation and scope.

- **Starting point**: the repo is a fresh Tauri 2 + SvelteKit (adapter-static SPA) + Svelte 5 template. It has no app code, `csp: null`, and an 800×600 window.
- **Data source**: Mixxx's SQLite database, profiled on the user's library (633 live tracks, all with BPM and key, 11 crates):
  - `library.key` is written in whatever key notation Mixxx was set to at analysis time, so values are mixed (e.g. `8B` and `Db` for the same key). `library.key_id` is canonical: 1–12 = C…B major, 13–24 = Cm…Bm, 0 = unknown.
  - `Playlists.hidden = 2` marks history (session log) playlists. Mixxx appends a `PlaylistTracks` row as each track starts playing, with `pl_datetime_added` matching `library.last_played_at`.
  - The database uses `journal_mode=delete`, so committed rows are visible to other readers straight away.
  - Membership lives in `crates` / `crate_tracks`; file paths are in `track_locations`.
- **Density**: Camelot-compatible pairs number about 35k with no BPM limit and about 6.6k within ±6% BPM (~21 neighbours per track). A free force-directed layout of the full graph is unreadable, so every view uses a deterministic layout.
- **Routing feasibility**: with strict moves and ±6% BPM, any track reaches any other in a median of 5 hops (max 9). With the extended move set, the median is 3 (max 7).
- **unovis**: `@unovis/svelte@1.7.1` has a peer dependency of `svelte ^4`, and the project runs Svelte 5.56. `@unovis/ts` renders the Graph component as SVG with D3.

## Goals / Non-Goals

**Goals:**
- Show suggestions within about a second of Mixxx registering a new track.
- Use deterministic layouts only: nothing moves unless the data changes.
- Keep all transition logic in pure, unit-testable TypeScript modules, independent of rendering.
- Retire the three named risks (unovis on Svelte 5, SVG performance, macOS permission prompt) before building views on them.

**Non-Goals:**
- Writing to the Mixxx database, or controlling Mixxx in any way.
- Audio decoding or analysis (blend-aware risk is on the roadmap).
- Drawing every compatible edge on the wheel map.
- Persisting app state beyond small UI preferences (tolerance, selected crates, follow toggle).

## Decisions

### D1. Rust owns I/O; TypeScript owns the graph
Rust locates and reads the Mixxx database and polls for now-playing. It sends normalised data to the webview through Tauri commands and events. The graph builder, risk table, ranking and router live in TypeScript.

- **Why**: at library sizes of hundreds to a few thousand tracks, rebuilding edges in TS is instant. Tolerance changes then re-render with no IPC round-trip, and the logic is testable with plain unit tests.
- **Alternative**: everything in Rust with `petgraph`. Faster at very large scale, but each slider change would need an IPC call. Revisit if libraries exceed roughly 10k tracks.

IPC surface (indicative):
- `load_library() -> { tracks, crates, history }`
- `set_library_path(path)`
- event `now-playing` with `{ trackId, playedAt, playlistId }`

`Track` carries `id, artist, title, bpm, keyId, camelot {num, letter}, duration, crateIds[]`.

### D2. Read-only, concurrent-safe database access
Open with `SQLITE_OPEN_READONLY` (URI `mode=ro`) through `rusqlite`, with a short busy timeout and retry. Never create, write or keep a write lock.

- **Why**: Mixxx may be running and writing history rows; with `journal_mode=delete`, a read-only reader only waits briefly.
- **Alternative**: copy the file to a snapshot on each read. Safer against locks, but slower for 1 s polling, and it duplicates a growing file.

### D3. Canonical key from `key_id`
Map `key_id` to Camelot and ignore `library.key`:
- major `i ∈ 1..12` → `num = ((i−1)·7 + 7) mod 12 + 1`, letter `B`
- minor `i ∈ 13..24` → `num = ((i−13)·7 + 4) mod 12 + 1`, letter `A`

The mapping was verified against the user's library (e.g. `key_id 21` (G♯m) → 1A, `1` (C) → 8B, `13` (Cm) → 5A).

Tracks with `key_id = 0`, `bpm <= 0` or `mixxx_deleted = 1` are excluded from suggestions, the compass and routing. The UI reports how many tracks were excluded.

### D4. Now-playing by polling the latest history playlist
Every ~1 s, Rust queries the newest `Playlists` row with `hidden = 2`, then the highest-`position` `PlaylistTracks` row in it. It emits `now-playing` when that row changes. The same playlist defines "played tonight".

Manual override:
- Picking a track sets now-playing at once.
- The next *new* history row takes over again, because it reflects what is actually playing.
- A "Follow Mixxx" toggle turns automatic detection off entirely; the manual override then works on its own.

- **Why**: this needs no Mixxx plugin or controller mapping, works offline, and the observed write timing (on track start) is when the DJ needs the next options.
- **Alternatives**:
  - Mixxx controller scripting or MIDI out: needs a custom mapping and gives poor access to track metadata.
  - Filesystem watching on the database file: platform-specific, with coalesced events. It could replace polling later.

### D5. Move catalogue
Moves are defined from the source Camelot code by number delta (mod 12) and whether the letter changes:

| Move | Same letter Δ | Letter change Δ | Label |
|---|---|---|---|
| Same key | 0 | — | same |
| Adjacent | ±1 | — | +1 / −1 |
| Relative | — | 0 | relative |
| Diagonal | — | ±1 | diagonal |
| Whole tone | ±2 | — | +2 "energy boost" / −2 |
| Semitone | ±7 | — | semitone up / down |
| Parallel | — | +3 (A→B), −3 (B→A) | parallel |

Two tracks are linked when a catalogue move relates them **and** their BPMs pass D7. Labels such as "energy boost" are shown as conventions (badges), not encoded as perceptual axes, because research found no perception evidence for them (see D9).

### D6. Harmonic risk from Krumhansl–Kessler key profiles
Precompute a 24×24 table. Risk is `(1 − r) / 2`, where `r` is the Pearson correlation between the two keys' rotated Krumhansl–Kessler probe-tone profiles. The values are then normalised to 0..1 over the catalogue's moves.

- **Why**: the profiles come from listener ratings and reproduce the perceived key-distance map (circle of fifths plus relative and parallel links).
- **Alternative**: counting shared scale notes (7/7, 6/7…). Simpler, but coarser: it ties relative with same key and +1 with diagonal.

### D7. BPM compatibility
Pass when `min over m ∈ {1, 2, ½} of |a·m − b| / min(a·m, b) ≤ tol`, with `tol` defaulting to 0.06 and adjustable.

- Half/double-time matches are flagged so the UI can mark them.
- The signed BPM gap (as %) is kept for display and ranking.
- Keylock is assumed on, so tempo never changes a track's key.

### D8. Next-up ranking
- **Default order**: a combined score, `score = risk + bpmGap% / tol`. Both terms run from 0 to 1, so they are weighted equally.
- **Sorting**: columns for BPM gap and risk can be sorted directly.
- **Played tonight**: tracks are dimmed and sorted last, but never hidden.
- **Pool**: candidates come from the track pool (D12).

### D9. Transition compass encoding (deterministic polar layout)
The current track sits at the centre.

- **Side**: the target mode. Minor targets go on the left ("darker"), major on the right ("brighter"). The mood effect is stated as fact in the UI, without hedging.
- **Radius**: harmonic risk (D6). Rings come from risk bands.
- **Angle**: signed wheel direction (counter-clockwise below, clockwise above), so each move has a fixed slot.
- **Within a slot**: tracks spread by BPM gap, with the smallest gap nearest the slot centre. Each slot has a cap and an overflow count, which keeps the view legible.
- **Rendering**: positions are computed in TS and handed to the unovis Graph as precalculated node positions (no force simulation).
- **Linked selection**: selecting a node highlights the matching next-up row, and the reverse.

The evidence behind this encoding:
- Mode is the dominant, well-supported cue for perceived valence and brightness (Korsakova-Kreyn & Dowling 2014; Hunter et al. 2010).
- Key distance is perceived (Krumhansl).
- "Energy lift" from key changes has no perceptual support for DJ transitions.

### D10. Request routing: fewest tracks first
The search runs from the current track to the requested one. Edge cost is `1 + ε·risk`, with `ε` small enough that risk only breaks ties between routes of the same length (fewest hops first, then lowest total risk).

- Intermediate tracks come from the track pool. The destination may be any library track, so requests from outside tonight's crate still work.
- Tracks played tonight and the current track are excluded as intermediates.
- **Rerouting** on each now-playing change: if the new track is on the route, trim the route; otherwise recompute.
- **No route**: the UI says so and offers to widen the BPM tolerance.
- **Alternative**: plain BFS. Equivalent for hop count, but with arbitrary tie-breaks.

### D11. Wheel map
- **Layout**: 24 sectors (12 numbers × A inner ring / B outer ring). Each track's radius within its ring band comes from its BPM, normalised over the pool.
- **What's drawn**: all pool tracks as small nodes, plus only the route edges and, optionally, the current track's compatible edges. Not drawing the ~6.6k edges keeps SVG costs low and the map readable.
- **Rendering**: plain Svelte SVG (keyed circles plus a route polyline), not unovis. See D13 for the spike results behind this.

### D12. Track pool
The pool is either the whole library or a union of selected Mixxx crates. The selection is persisted locally (UI preference) and applies to suggestions, the compass and route intermediates.

### D13. unovis through `@unovis/ts`
Wrap `@unovis/ts` (`SingleContainer` + `Graph`) in a thin Svelte 5 component that creates it on mount, calls `setData`/`updateContainer` from an `$effect`, and destroys it on unmount.

- **Why**: the official wrapper's peer dependency is Svelte 4.
- **Scope**: unovis renders the **compass only**. The wheel map uses plain Svelte SVG (D11).

Spike results (task 1.4; synthetic library of 650 tracks over 24 keys and 70–180 BPM; Chromium in the dev browser pane, window visible; main-thread blocking measured with long-task timing):

| Render | Nodes | Main thread blocked per update |
|---|---|---|
| unovis Graph, precalculated layout | 50 | ~54 ms (no long task) |
| unovis Graph | 100 | ~100–114 ms |
| unovis Graph | 200 | ~204–219 ms |
| unovis Graph | 400 | ~438–444 ms |
| unovis Graph (wheel map) | 650 | ~470–730 ms |
| plain SVG (same 650 circles + polyline) | 650 | none (update visible within 2 frames, 32–39 ms) |

- Cost grows linearly at about 1.1 ms per node on every update, including a selection-only change (`selectedNodeId`), and is unaffected by turning off labels, gauges, zoom, drag or brush.
- Each update also animates every node's gauge arc for about 1 s despite `duration: 0`, about 58k DOM attribute writes per update.
- The compass has at most ~104 nodes (13 slots × 8) and typically ~25, so unovis stays within budget there.
- The wheel map at ~650 nodes would freeze the UI for ~0.5–0.7 s on every hover, selection or reroute.
- Decision: keep unovis for the compass and draw the wheel map with plain Svelte SVG. sigma.js (WebGL) was the planned fallback but is unnecessary: a static scatter plot with a polyline needs no graph engine and adds no dependency.
- Not yet verified in the Tauri macOS webview (WebKit). Task 8.1 repeats the check on real data in the app.

### D14. UI shell
- **Components**: shadcn-svelte (bits-ui, Tailwind v4), dark theme by default, laid out for a dedicated monitor:
  - Top bar: now-playing, request search, Follow Mixxx toggle, BPM tolerance, pool picker.
  - Main area: compass and wheel map side by side.
  - Bottom: the next-up list.
- **Keyboard-first**: shortcuts to focus search, set the current track, and select a request target.
- **Window**: the default size grows from 800×600 to suit a full monitor.

### D15. Offline guarantee
- **CSP**: `default-src 'self'`, with no remote origins.
- **Assets**: fonts and icons are bundled (e.g. npm font packages), with no CDN.
- **Plugins**: no network-capable Tauri plugins. Drop `tauri-plugin-opener`, which hekate doesn't need.
- **Capabilities**: limited to hekate's own commands.
- **Dev builds don't enforce the CSP on macOS**: `tauri dev` loads the Vite server directly, so no CSP is injected (a cross-origin image loaded there). Built binaries (`pnpm tauri build --debug --no-bundle` or release) serve `tauri://localhost` with the CSP enforced. There, an `http://127.0.0.1` image raised an `img-src` violation and the target server received no request. Verify CSP behaviour in built binaries only.

### D16. Locating the library and macOS access
Probe these default locations in order:
- macOS sandboxed `~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/`
- macOS `~/Library/Application Support/Mixxx/`
- Linux `~/.mixxx/`
- Windows `%LOCALAPPDATA%\Mixxx\`

If none is found or readable, a file picker lets the user choose `mixxxdb.sqlite`, and the path is persisted. On macOS, the first read of another app's container triggers the "access data from other apps" prompt. The first-run flow explains why before reading, and handles denial with guidance plus the file picker.

## Risks / Trade-offs

- [Rendering performance on the wheel map with ~600+ nodes] → Spike done (D13): unovis was too slow there, so the map uses plain Svelte SVG and draws only route and focus edges (D11).
- [Compass in unovis approaches ~100 ms at the per-slot cap] → Keep the per-slot cap (D9) and avoid re-rendering the compass for hover-only changes.
- [Writing our own `@unovis/ts` wrapper means maintaining it] → Keep it under ~50 lines with no unovis API leakage beyond graph data and config.
- [Mixxx schema changes across versions] → Read only stable columns (`library`, `crates`, `crate_tracks`, `Playlists`, `PlaylistTracks`, `track_locations`). Detect missing columns and fail with a clear message.
- [History-based now-playing lags or misfires (e.g. previewing in headphones, history disabled)] → The manual override always works. The Follow toggle can turn detection off.
- ["Tonight" is assumed to be the newest history playlist] → If Mixxx starts a new history playlist mid-set (restart), played-tonight resets. That's acceptable for v1, and the next-up list never hides tracks anyway.
- [Database locked during a Mixxx write] → Busy timeout plus retry on the next poll. A missed tick costs at most ~1 s.
- [macOS permission denied] → File-picker fallback and an explanatory first-run screen (D16).
- [Mixxx key detection errors propagate into suggestions] → Out of scope to fix. Risk and moves are only as good as the analysed key.
- [The compass mood framing is culturally learned and probabilistic] → Accepted. The user chose to state it as fact for brevity.

## Open Questions

Resolved during implementation:
- **Compass risk rings**: drawn at risk 0.35, 0.7 and 1.0, which also set the colour bands. From 8A the computed risks fall naturally into these bands:
  - safe: same 0, relative 0.23, diagonal 7B 0.31, parallel 0.33
  - moderate: ±1 0.44, diagonal 9B 0.51
  - bold: ±2 0.77, semitone 0.93
- **Per-slot cap**: 8 tracks per compass slot, with an overflow count in the slot label. At that cap the compass stays legible, and a selection update costs one ~70 ms task with ~80 nodes.

Still open:
- Which platforms beyond macOS get verified in this change. Path discovery covers all three either way.
