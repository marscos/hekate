# Proposal

## Why

hekate can only be run by building it from source. The repo has no CI, tags or releases. The one local build is an Apple-Silicon-only `.dmg` that is only linker-signed, so a downloaded copy would show "hekate is damaged" on macOS. DJs need a download they can install from GitHub on any of the three desktop platforms.

## What Changes

- New GitHub Actions workflow. Pushing a `v*` tag runs the test suite, builds hekate for macOS, Windows and Linux, and attaches the installers to a **draft** GitHub Release. The maintainer publishes it by hand.
- Release artifacts: one universal macOS `.dmg` (Apple Silicon and Intel), a Windows NSIS `.exe` installer, and a Linux `.AppImage` and `.deb`.
- macOS builds are **ad-hoc signed** with a properly sealed bundle and not notarized, so a download opens through Privacy & Security > Open Anyway instead of being reported as damaged. Each new version needs Open Anyway once. Users whose library is in Mixxx's sandboxed folder are asked for data access on each launch; reducing that belongs to a later change (see design D4).
- Windows and Linux builds are marked **UNVERIFIED** in every release's notes and in the README, because the maintainer does not test them.
- Each release's notes start with the UNVERIFIED label and first-launch instructions for each platform, followed by notes generated from the merged changes.
- One version number: `tauri.conf.json` reads its version from `package.json`. The workflow refuses to build if the tag, `package.json` and `src-tauri/Cargo.toml` disagree.
- README gains a Download section: where to get releases, which platforms are UNVERIFIED, how to open an unnotarized macOS app, and how to bypass SmartScreen on Windows.
- No auto-updater is added. Users install new versions by downloading them. This keeps the existing no-network guarantee.

Out of scope: Apple Developer ID signing and notarization, Windows code signing, auto-update, package managers (Homebrew, winget, Flathub), and publishing from branches other than tags.

## Capabilities

### New Capabilities
- `distribution`: How users get and update hekate. Covers downloadable releases per platform, an intact macOS signature, manual (non-automatic) updates, labelling of untested platforms, first-launch and permission guidance, and keeping versions consistent between the release and the app.

### Modified Capabilities
<!-- None. offline-operation already forbids update checks; distribution relies on that requirement but does not change it. -->

## Impact

- **New files**: `.github/workflows/release.yml`, a release-notes header file under `.github/`, and a version check script under `scripts/`.
- **Config**: `src-tauri/tauri.conf.json` (`version` points to `../package.json`; ad-hoc macOS signing identity `"-"`).
- **Docs**: README.md gains Download, first-launch and release instructions for the maintainer.
- **GitHub repo settings**: none. The workflow needs no secrets and uses `contents: write` only for the release jobs.
- **App code**: no changes to the frontend or the Rust backend.
- **Spike outcome**: a self-signed certificate was tested as a free stable identity and rejected, because macOS still asked for the permission on every launch (design D4). Developer ID signing is left as a later upgrade.
