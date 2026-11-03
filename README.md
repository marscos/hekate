# hekate

A live, offline next-track assistant for DJs using [Mixxx](https://mixxx.org). hekate reads your Mixxx library and shows, for the track that is playing:

- **Next up**: compatible tracks ranked by harmonic risk and BPM gap.
- **Compass**: how each possible move changes the atmosphere (darker or brighter, safe or risky, which way around the Camelot wheel).
- **Wheel map**: a route of smooth transitions to a requested track.

Built with Tauri 2, SvelteKit (Svelte 5), shadcn-svelte and unovis.

[hekate-demo.webm](https://github.com/user-attachments/assets/66f36d12-3000-48e0-bd93-b7f3e3b2f7cd)


## Development

```bash
pnpm install
pnpm tauri dev      # run the desktop app
pnpm test           # unit tests (Vitest)
pnpm check          # type checks
cargo test --manifest-path src-tauri/Cargo.toml
```

`pnpm dev` alone serves the UI in a normal browser at http://127.0.0.1:1420 with a synthetic library standing in for the Rust backend (development only). Add `?mock=notice`, `?mock=denied` or `?mock=notfound` to see the first-run screens, and call `__hekateMock.play(trackId)` in the console to simulate Mixxx starting a track.

## Your Mixxx library

hekate only ever **reads** Mixxx's database (`mixxxdb.sqlite`). It opens it read-only, works while Mixxx is running, and never writes to it or creates files next to it.

At startup it looks in these places, in order:

| Platform | Location |
|---|---|
| macOS (Mixxx from mixxx.org, sandboxed) | `~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/` |
| macOS (other builds) | `~/Library/Application Support/Mixxx/` |
| Linux | `~/.mixxx/` |
| Windows | `%LOCALAPPDATA%\Mixxx\` |

A file you pick yourself (folder button in the top bar, or **Choose file…** on the start screen) is remembered and tried first on the next launch. Use the reload button after editing crates or analysing tracks in Mixxx.

Tracks with no detected key or BPM are left out of suggestions, the compass and routing. The top bar shows how many.

### macOS permission prompt

The sandboxed Mixxx build keeps its library inside its own app container. The first time hekate reads it, macOS asks whether hekate may **access data from other apps**. hekate explains this before the prompt appears. If you choose **Don't Allow**, you can allow it later in System Settings › Privacy & Security, or pick the `mixxxdb.sqlite` file manually instead.

## Offline by design

hekate works with no network connection and never makes network requests: no fonts, icons, updates, telemetry or crash reports are fetched or sent.

- All assets (fonts, icons, styles) are bundled with the app. Never load anything from a CDN or remote URL.
- The webview runs under a strict Content Security Policy (`src-tauri/tauri.conf.json`) that only allows the app's own origin. Remote resources are blocked even if one is referenced by mistake.
- No network-capable Tauri plugins are installed, and the window's capabilities are limited to what hekate itself uses.

The CSP is enforced in built binaries (`pnpm tauri build`, or `pnpm tauri build --debug --no-bundle` for a quick debug build). `pnpm tauri dev` loads the Vite dev server directly and doesn't enforce it, so check CSP behaviour in a build.
