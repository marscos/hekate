# hekate

A live, offline next-track assistant for DJs using [Mixxx](https://mixxx.org). hekate reads your Mixxx library and shows, for the track that is playing:

- **Next up**: compatible tracks ranked by harmonic risk and BPM gap.
- **Compass**: how each possible move changes the atmosphere (darker or brighter, safe or risky, which way around the Camelot wheel).
- **Wheel map**: a route of smooth transitions to a requested track.

Built with Tauri 2, SvelteKit (Svelte 5), shadcn-svelte and unovis.

[hekate-demo.webm](https://github.com/user-attachments/assets/66f36d12-3000-48e0-bd93-b7f3e3b2f7cd)


## Download

Get the latest version from [Releases](https://github.com/marscos/hekate/releases/latest).

| Platform | File | Status |
|---|---|---|
| macOS (Apple Silicon and Intel) | `hekate_<version>_universal.dmg` | Tested |
| Windows 10/11 (x64) | `hekate_<version>_x64-setup.exe` | **UNVERIFIED** |
| Linux (x86_64) | `hekate_<version>_amd64.AppImage` or `.deb` | **UNVERIFIED** |

**UNVERIFIED** builds come from the same automated build but haven't been tested by the maintainer. They may not work; please [open an issue](https://github.com/marscos/hekate/issues) if they don't.

hekate never updates itself (see [Offline by design](#offline-by-design)). To update, download the new release and install it over the old one. Your settings are kept.

### First launch on macOS

hekate isn't notarized by Apple, so macOS asks you to confirm each new version once:

1. Open the `.dmg` and drag **hekate** to **Applications**.
2. Open hekate. macOS says it could not verify the app. Click **Done**.
3. Open **System Settings › Privacy & Security**, scroll down to the message about hekate, and click **Open Anyway**. Confirm with your password if asked.

After that, this version opens normally. Repeat these steps after installing a new version.

If you use Mixxx from mixxx.org, macOS also asks each time you open hekate whether it may **access data from other apps**. See [macOS permission prompt](#macos-permission-prompt).

### First launch on Windows

Windows SmartScreen may say "Windows protected your PC". Click **More info**, then **Run anyway**.

The installer uses Microsoft Edge WebView2, which Windows 10 and 11 normally already have. If it's missing, the installer downloads it, so install hekate while online. hekate itself never uses the network.


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

The sandboxed Mixxx build keeps its library inside its own app container. When hekate reads it, macOS asks whether hekate may **access data from other apps**. hekate explains this before the prompt appears the first time. Allowing it lets hekate read the library; hekate never changes it.

hekate isn't signed with an Apple Developer ID, so macOS doesn't remember your answer and asks again each time you open hekate. If you choose **Don't Allow**, you can allow it later in System Settings › Privacy & Security, or pick the `mixxxdb.sqlite` file manually instead.

## Offline by design

hekate works with no network connection and never makes network requests: no fonts, icons, updates, telemetry or crash reports are fetched or sent.

- All assets (fonts, icons, styles) are bundled with the app. Never load anything from a CDN or remote URL.
- The webview runs under a strict Content Security Policy (`src-tauri/tauri.conf.json`) that only allows the app's own origin. Remote resources are blocked even if one is referenced by mistake.
- No network-capable Tauri plugins are installed, and the window's capabilities are limited to what hekate itself uses.

The CSP is enforced in built binaries (`pnpm tauri build`, or `pnpm tauri build --debug --no-bundle` for a quick debug build). `pnpm tauri dev` loads the Vite dev server directly and doesn't enforce it, so check CSP behaviour in a build.

## Releasing

Releases are built by GitHub Actions and published from [Releases](https://github.com/marscos/hekate/releases). The workflow needs no repository secrets. macOS builds are ad-hoc signed (`bundle.macOS.signingIdentity: "-"` in `tauri.conf.json`), the same as a local `pnpm tauri build`.

### Making a release

1. Bump the version in `package.json` and `src-tauri/Cargo.toml` (run `cargo check --manifest-path src-tauri/Cargo.toml` to update `Cargo.lock`), commit, and push to `main`. `tauri.conf.json` reads its version from `package.json`.
2. Check the versions agree, then tag and push. Push the commit to a branch first: GitHub doesn't start the workflow for a tag whose commit isn't on any branch on GitHub.

   ```bash
   scripts/check-version.sh v0.2.0
   git tag v0.2.0 && git push origin v0.2.0
   ```

3. The **Release** workflow runs the tests and type checks, creates a draft release whose notes start with `.github/release-notes-header.md` followed by GitHub's generated notes, then builds macOS, Windows and Linux in parallel and attaches the installers. If the tag doesn't match the versions in the source, it stops before creating anything.
4. Download the macOS `.dmg` from the draft, install it and check it works. Then click **Publish release**.

If one platform's build fails, the other installers are still attached and the release stays a draft. Fix the cause, then use **Re-run failed jobs** on the workflow run: the rebuilt installer is uploaded to the same draft. Don't re-run the whole workflow, which would create a second draft.

To abandon a release, delete the draft and the tag (`git push --delete origin v0.2.0`).
