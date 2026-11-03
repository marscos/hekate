# Proposal

## Why

The compass identifies tracks only by text, which is slow to scan in a dark booth. Album covers are the fastest way a DJ recognises a track, and Mixxx already records where each track's cover is (in your library, 632 of 633 tracks have one embedded). hekate ignores that data today.

## What Changes

- Read Mixxx's cover metadata for each track: whether a cover exists, whether it is embedded in the audio file or is an image file in the track's folder, its digest, and its dominant colour.
- Extract the cover from the audio file's tags (or read the folder image), shrink it to a thumbnail, and cache it in hekate's own cache folder keyed by the cover digest. Neither the Mixxx library nor any audio file is ever written to.
- Show the cover in the compass details card (hover or selection) and on the centre (now-playing) node.
- Never wait on a cover: draw the track's dominant colour first and swap the image in once it is ready. If the file is missing, its drive is unplugged, macOS denies access, or the image cannot be decoded, the colour simply stays, with no error. A cover that is already cached shows even when its drive is unplugged.
- On macOS, after each library load or reload, read one file per permission zone (each mounted volume, and each top-level home folder) in the background. Any macOS file-access prompt (removable or network volume, Desktop, Documents, Downloads, iCloud Drive) then appears while the DJ is setting up, not mid-set when a cover is first needed.
- No explanation is shown before these prompts, and hekate never asks for Full Disk Access. The README documents how to grant access later in System Settings.

Out of scope: covers on the compass candidate nodes, the wheel map, the next-up list or the top bar; an in-app hint after a denied prompt; choosing or editing covers; fetching covers from the internet.

## Capabilities

### New Capabilities
- `cover-art`: How hekate finds, extracts, caches and falls back for a track's album cover, and when it surfaces the macOS file-access prompts needed to read audio files.

### Modified Capabilities
- `transition-compass`: The details card shows the track's cover, and the centre node shows the now-playing track's cover.

## Impact

- **Rust**: `src-tauri/src/mixxx/library.rs` reads the optional `coverart_*` columns and the track's file location; a new `src-tauri/src/covers/` module handles extraction, thumbnails, the cache and permission zones; a new `track_cover` command; `AppState` keeps each track's cover source and the zones already checked this session.
- **Dependencies**: `lofty` (reading tags) and `image` (JPEG/PNG decoding and resizing, default features off).
- **Frontend**: `Track` gains `coverColor` and `coverDigest`; a small cover store requests and memoises thumbnails; `compass.svelte` draws the cover in the details card and over the centre node; `mock-ipc.ts` serves placeholder covers in dev.
- **Config**: none. The CSP already allows `img-src data:`, and covers are delivered as data URIs.
- **Compatibility**: cover columns are optional, so Mixxx databases that lack them still load (with no covers).
- **Related change**: macOS remembers each prompt's answer against the app's code identity. Until `add-github-releases` gives builds a stable signing identity, every rebuild asks again.
