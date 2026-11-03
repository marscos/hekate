# Design

## Context

See proposal.md (Why, What Changes) for motivation, and specs/cover-art/spec.md and specs/transition-compass/spec.md for the requirements.

- **What Mixxx records**: `library` has `coverart_type` (0 none, 1 embedded in the file, 2 image file), `coverart_source` (0 unknown, 1 guessed, 2 chosen by the user), `coverart_location` (the image file for type 2), `coverart_hash` (integer, older Mixxx versions), `coverart_digest` (blob, newer versions) and `coverart_color` (dominant colour as an RGB integer). `library.location` points at `track_locations`, which holds the audio file's absolute `location` and its `directory`. hekate reads none of these today (`src-tauri/src/mixxx/library.rs`), and `db.rs` `REQUIRED` doesn't list them.
- **Mixxx doesn't keep covers on disk.** It reads them out of the tags on demand and caches them only in memory, so hekate has to extract them itself.
- **Real library**: 633 tracks in 344 folders, all under `/Volumes/REDRAGON` (a USB drive, not always mounted). 632 tracks have an embedded cover, and all 632 have `coverart_color` and `coverart_digest`. Other users' libraries will be on the internal disk or spread across volumes.
- **App shell**: the CSP allows `img-src 'self' data:`. `AppState` keeps the library path for the now-playing poller. The compass (`compass.svelte`) draws nodes with unovis at precalculated pixel positions, with an SVG overlay underneath and an HTML details card in the bottom-left. The centre node is 34 px, filled with `--foreground` and labelled with its key.
- **macOS file access**: hekate is not sandboxed, so reading most of the disk needs no permission. macOS asks once per protected category, the first time a file in it is opened: removable volumes, network volumes, Desktop, Documents, Downloads and iCloud Drive. It remembers the answer against the app's code identity (see `add-github-releases`).

## Goals / Non-Goals

**Goals:**
- A cover lookup never blocks rendering, never errors in the UI, and never touches the disk once its thumbnail is cached.
- The library payload stays small: no image data in it.
- The cover pipeline lives in one Rust module that can be tested against fixture files.

**Non-Goals:**
- Matching Mixxx's cover choice when Mixxx's database and the file disagree. hekate trusts Mixxx's `coverart_type` and only looks where it says.
- Re-detecting covers Mixxx hasn't found (for example a `cover.jpg` added after Mixxx last scanned the track).
- A cache size limit or eviction. Thumbnails are about 10 KB, so a 10,000-track library is about 100 MB at most.

## Decisions

### D1. Cover metadata in the library payload, image data on request
`library::load_tracks` reads the cover columns and the joined `track_locations.location` when present. `Track` gains two fields for the frontend:
- `cover_color: Option<String>`: `#rrggbb`, from `coverart_color`.
- `cover_digest: Option<String>`: hex of `coverart_digest`, or of `coverart_hash` when the digest is NULL. It's `None` when `coverart_type` is 0 or there's no file location.

The Rust side keeps, per track id, a `CoverSource { kind: Embedded | File(PathBuf), audio_path: PathBuf, key: String }` in a `covers: Mutex<HashMap<i64, CoverSource>>` on `AppState`. Each load or reload replaces it. For type 2, an absolute `coverart_location` is used as is, and a relative one is joined with the track's directory.

A new command, `track_cover(track_id) -> Option<String>`, returns a `data:image/jpeg;base64,…` URI, or `None`.

- **Why**: the payload grows by two short strings per track. Image data only moves for the one or two covers on screen. The frontend never sees file paths, so it can't ask hekate to read arbitrary files.
- **Alternatives**: base64 thumbnails inside the library payload (megabytes per load, and every reload would wait on disk reads); Tauri's asset protocol with `convertFileSrc` (embedded art isn't a file, and it needs the CSP and scopes widened); a custom `cover://` URI scheme (it also needs a CSP change, and data URIs are enough for two images).

### D2. Cover columns are optional
`db.rs` `REQUIRED` stays as it is. `load_tracks` checks `PRAGMA table_info(library)` once per load and only selects `coverart_*` columns that exist, falling back to "no cover" otherwise. The fixture gains the columns, plus a second fixture variant without them.

- **Why**: covers are decorative. An older or unusual Mixxx schema shouldn't stop the library loading.

### D3. Pipeline: cache, then file, then thumbnail
`covers::thumbnail(source, cache_dir) -> Result<Vec<u8>, CoverError>`:
1. **Cache hit**: if `<app_cache_dir>/covers/<key>-128.jpg` exists, return it. The audio file isn't touched, so the cover shows even with its drive unplugged.
2. **Read**: for `Embedded`, open the audio file read-only and read its tags with `lofty`. Take the front-cover picture, or else the first picture. For `File`, read the image file.
3. **Thumbnail**: decode with `image` (JPEG and PNG features only), resize to fit 128×128 with a triangle filter, encode as JPEG at quality 85.
4. **Store**: write to a temporary file in the cache folder, then rename it into place, so a half-written file is never read as a hit.

The `track_cover` command runs this on `spawn_blocking`, and maps every `CoverError` (not found, permission denied, unsupported format, decode failure, cache write failure) to `Ok(None)`, logging it with `eprintln!` in debug builds. A cache write failure still returns the image.

- **Real library (task 1.2, 2026-11-03)**: of 633 tracks, 632 are `coverart_type = 1` (embedded, 628 FLAC and 4 M4A) with a 32-byte digest, an integer hash and a colour, and 1 is type 0. The 632 embedded pictures are 630 JPEG (including 3 greyscale) and 2 PNG, so the `webp` feature isn't needed. There are no type-2 rows, so this library can't show whether Mixxx stores `coverart_location` relative or absolute; both are handled. Running this pipeline over all 632 covers produced 632 thumbnails with no errors (395 cache files, 2.5 MB, since albums share a cover). The slowest cover (5835×5835) took 0.5 s in a release build, and all warm reads together took 32 ms.
- **Why 128 px**: the details card shows 64 px and the centre node 48 px, and 128 px covers both at 2× scaling. One size means one cache file per cover.
- **Why the digest as key**: Mixxx changes it whenever the image changes, so a changed cover gets a new key with no invalidation logic. A stale old file is harmless.
- **Alternatives**: keeping the cache in memory only (lost on restart, so no covers with the drive unplugged); caching next to the Mixxx database (forbidden by the read-only requirements).

### D4. Frontend cover store
`src/lib/state/covers.svelte.ts` holds `Map<string, string | null>`, keyed by digest, plus a map of in-flight requests so a cover is only requested once at a time. `cover(track)` returns the URI, `null` (no cover or failed), or `undefined` (loading, which triggers the request). A failed lookup is remembered as `null` until the next library reload, so hovering over a track on an unplugged drive doesn't retry endlessly.

`compass.svelte` asks for covers for only two tracks: the one in the details card and the now-playing track.

### D5. Where the cover is drawn
- **Details card**: a fixed 64×64 square on the left of the existing text block. It is filled with `coverColor` (or `--muted` when none), with the `<img>` on top once loaded. The square is always present, so the card's size doesn't depend on the cover (transition-compass, "Candidate without a cover").
- **Centre node**: an absolutely positioned, `pointer-events-none` 48 px circle centred at (`cx`, `cy`), above the unovis layer. It is filled with `coverColor`, then the image is drawn on top with `object-fit: cover`. When the now-playing track has a cover, the unovis centre node grows from 34 to 48 px so links end at the circle's edge, and its key label moves to a small pill below the circle in the overlay so it stays readable. When there's no cover, nothing changes.
- **Why an HTML overlay rather than `nodeEnterCustomRenderFunction`**: the centre is a single node at a known position, so an `<img>` is simpler than adding `<image>` and `<clipPath>` inside unovis's node groups, and it doesn't depend on unovis's custom-render API. Candidate nodes, where custom rendering would be needed, are out of scope.

### D6. Permission zones and the startup check
`covers::zone_of(path, home) -> Option<Zone>` is a pure function over the path string, with no disk access:
- `/Volumes/<name>/…` → `Zone::Volume(name)`
- `<home>/Library/Mobile Documents/…` → `Zone::HomeFolder("Library/Mobile Documents")` (iCloud Drive)
- `<home>/<first>/…` → `Zone::HomeFolder(first)`
- anything else → `Zone::BootDisk`

After `load_library`, `reload_library` and `set_library_path` succeed, the command spawns one background thread (macOS only, `#[cfg(target_os = "macos")]`). For each zone not yet checked this session (a `checked_zones: Mutex<HashSet<Zone>>` on `AppState`), in a stable order:
1. For a `Volume` zone, skip it if `/Volumes/<name>` doesn't exist (drive not mounted). It isn't marked as checked, so a later reload checks it.
2. Take the zone's tracks in id order and open the first track's audio file read-only. Opening the file is what triggers the prompt. If that track has a cover, pass it through D3 steps 2–4 regardless of the cache, so the check also warms the cache. If the file is missing, try the next track, up to 3.
3. Mark the zone as checked, whatever the outcome: allowed, denied or missing.

Zones are checked one after another, so macOS shows at most one prompt at a time, and nothing waits on the thread.

- **Why one file per zone, not per folder**: macOS asks per category, not per folder. Reading one file per volume and per home folder triggers every prompt the library can cause, in about 1–20 reads, where per-folder reads would mean thousands of file opens on a large library (and a sleeping USB drive spinning up). Using top-level home folders rather than a fixed list of protected folders also covers any folder a future macOS starts protecting, at the cost of a few unnecessary reads.
- **Why check again on every launch**: once macOS has remembered an answer, the check is silent, and it's no more than a few file opens. Tracking which answers were given would mean guessing at macOS's state.
- **Windows and Linux**: no check. Covers load on demand.

### D7. Dev mode
`mock-ipc.ts` gives synthetic tracks a `coverColor` and a `coverDigest` (most tracks, not all), and answers `track_cover` with a generated SVG data URI in the track's colour after a short delay. This exercises the placeholder-then-image path in `pnpm dev`.

## Risks / Trade-offs

- [The macOS prompt may fire on `stat` or directory listing rather than on opening the file, or not on a plain read] → Task 1 is a spike on a real, signed build that confirms which call triggers each prompt before the check is built. The check itself is just an open, so the design holds whatever the answer.
- [In `pnpm tauri dev`, macOS attributes prompts to the terminal or IDE, and an ad-hoc build is re-prompted after each rebuild] → Run the manual checks on a bundled build. Stable answers across releases depend on `add-github-releases`.
- [Some covers are formats `image` can't decode with JPEG and PNG only, such as WebP or CMYK JPEG] → They fall back to the colour. Add the `webp` feature if the spike finds such covers in the real library.
- [A large embedded cover (several MB PNG) takes noticeable time on first view; the real library has 5835×5835 covers that take about 0.5 s] → The colour shows immediately. The startup check warms only one cover per zone, so the first view of other tracks still pays this once.
- [`coverart_location` semantics for type 2 vary between Mixxx versions (absolute or relative)] → Handle both (D1). An unresolvable path falls back to the colour.
- [A slow network volume makes the check slow] → It runs in the background and is bounded to a few opens per zone.
- [The cache grows without bound] → Accepted for now (Non-Goals). It lives in the OS cache folder, which the user or OS can clear safely.

## Open Questions

- Whether to show a one-time hint after a denied prompt ("Covers unavailable: allow access in System Settings > Privacy & Security > Files and Folders"). It is out of scope here. The README documents it, and it can be added later without changing the pipeline.
