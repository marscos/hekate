# Design

## Context

See proposal.md (Why) for motivation and specs/distribution/spec.md for the requirements.

- **Repo**: `marscos/hekate` is public, so GitHub-hosted macOS, Windows and Linux runners are free. No `.github/` directory, tags or releases exist yet.
- **Stack**: Tauri 2 (`tauri-cli` 2.12), SvelteKit static build, Rust edition 2024 with `rusqlite` (`bundled`, needs a C compiler), pnpm 10 with lockfile v9, Node 24 locally.
- **Version** `0.1.0` is set separately in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
- **Bundling**: `tauri.conf.json` has `bundle.targets: "all"` and no macOS signing settings.
- **Current macOS signature**: the local `.app` is `adhoc,linker-signed` with `Sealed Resources=none`. Its designated requirement is `cdhash H"…"`, and its identifier is `hekate-<hash>` rather than the bundle id. macOS records privacy permissions against the designated requirement, so each new build looks like a different app.
- **Existing specs**: `offline-operation` already forbids update checks. `mixxx-library-import` requires hekate to explain the macOS "access data from other apps" prompt before its first read. That prompt is the permission that must survive updates.

## Goals / Non-Goals

**Goals:**
- A release takes one action from the maintainer: bump the version, push a tag, review the draft, publish.
- The workflow needs no repository secrets. It only uses the built-in `GITHUB_TOKEN`.
- `pnpm tauri build` locally produces the same kind of macOS bundle as CI.

**Non-Goals:**
- CI on pull requests or branch pushes. The test job is written so it can be reused later, but this change doesn't trigger it on PRs.
- Reproducible or bit-for-bit verifiable builds, checksums or SBOMs.
- Supporting 32-bit Windows, ARM Linux, or macOS versions older than Tauri 2's minimum.

## Decisions

### D1. Tag-triggered workflow with three stages
`.github/workflows/release.yml` runs on `push: tags: ['v*']`:

```
verify (ubuntu) --> create-release (ubuntu) --> build (matrix: macos | windows | ubuntu)
  version check      draft release + notes        tauri-action builds and uploads
  pnpm test                                        to the draft's release id
  pnpm check
  cargo test
```

- **Why**: a failure in `verify` stops everything before a release exists, which meets "built from tested, tagged source". Creating the draft once, before the matrix, lets the three builds upload to the same release without racing to create it.
- **Alternative**: let `tauri-action` create the release itself (`tagName` / `releaseDraft`). Simpler, but it can't produce GitHub's generated notes, and each matrix job would try to create or find the release.
- **Alternative**: build locally and upload with `gh release upload`. The maintainer can only build for macOS, so this doesn't meet the per-platform requirement.

### D2. Build matrix and bundle formats
| Runner | Tauri args | Assets |
|---|---|---|
| `macos-latest` | `--target universal-apple-darwin --bundles dmg` | `hekate_<v>_universal.dmg` |
| `windows-latest` | `--bundles nsis` | `hekate_<v>_x64-setup.exe` |
| oldest supported `ubuntu-*` runner | `--bundles appimage,deb` | `hekate_<v>_amd64.AppImage`, `hekate_<v>_amd64.deb` |

- The macOS job installs both `aarch64-apple-darwin` and `x86_64-apple-darwin` Rust targets.
- Linux installs `libwebkit2gtk-4.1-dev`, `librsvg2-dev`, `patchelf` and build essentials. Building on the oldest available Ubuntu image means the AppImage links against an older glibc and runs on more distros.
- Bundle formats are chosen with CLI flags in CI. `bundle.targets` in `tauri.conf.json` stays `"all"`, so local builds are unchanged.
- **Why a universal dmg**: one download, and no "which Mac do I have?" question. It costs roughly double the macOS build time, which is fine for releases.
- **Why NSIS only**: one Windows installer is less to explain and install per user. `.msi` can be added if someone asks.
- **WebView2**: keep Tauri's default (`downloadBootstrapper`). Windows 10 and 11 normally already have WebView2. If a machine lacks it, the installer needs the internet once. The README says this; hekate itself stays offline.

### D3. One version number, checked against the tag
- `tauri.conf.json` `version` becomes `"../package.json"`, so the bundles and the app's reported version come from `package.json`.
- Cargo can't read `package.json`, so `src-tauri/Cargo.toml` keeps its own `version`. The `verify` job checks that `${GITHUB_REF_NAME#v}`, `package.json`'s version and `Cargo.toml`'s version are identical. If not, it fails with a message naming each value.
- To release, the maintainer bumps `package.json` and `Cargo.toml` (and `Cargo.lock` via `cargo check`) in one commit, then pushes the tag.
- **Alternative**: rewrite the versions from the tag inside CI. Then the committed source would disagree with the released app, which is confusing when reading the code later.

### D4. macOS builds are ad-hoc signed (spike outcome)
- **Decision**: `tauri.conf.json` sets `bundle.macOS.signingIdentity: "-"`. Every macOS build, local or CI, is an ad-hoc signed bundle with sealed resources, bundle identifier `com.marscos.hekate` and the hardened runtime. There are no signing secrets.
- **What it gives users**: an intact signature, so Gatekeeper says "could not verify" (Open Anyway works) instead of "damaged". Each new version needs Open Anyway once.
- **What it doesn't give them**: on Macs where the Mixxx library is in Mixxx's sandboxed container, macOS asks "access data from other apps" every time hekate opens.

**The spike** (tasks 1.3, 1.4) tested a self-signed certificate as a free way to get a stable identity. The approach was: CN `hekate release signing`, stored in Actions secrets, with designated requirement `identifier "com.marscos.hekate" and certificate leaf = H"…"`.

What worked:
- `codesign` signs with the untrusted certificate.
- `APPLE_SIGNING_IDENTITY` overrides the config value.
- Two builds with different CDHashes share one designated requirement.

The result, from a clean test (two quarantined `.dmg`s installed by dragging in Finder, so no App Translocation):
- Gatekeeper needed Open Anyway again for the second version.
- macOS asked for the data-access permission on **every launch**, even relaunching the same build.

The self-signed identity therefore gives users nothing that ad-hoc signing doesn't, so it was dropped. An earlier run that copied the apps with `ditto` was discarded: the apps ran translocated from a new random path on each launch.

**Not decided here**: reducing which permissions hekate asks for, and how often, belongs to the change that reads track files (`show-album-covers`), not to distribution.

**Upgrade path**: an Apple Developer ID plus notarization would remove Open Anyway, and very likely lets macOS remember the permission (untested). It needs the `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `KEYCHAIN_PASSWORD` and notarization secrets, passed only to the macOS build step, as a separate change.

**Alternatives**:
- Self-signed certificate: tried in the spike and rejected, as above.
- Developer ID: $99/yr. The maintainer chose not to for now.

### D5. Release notes: committed header plus generated notes
- `.github/release-notes-header.md` holds the fixed part of every release's notes:
  - an UNVERIFIED notice for the Windows and Linux downloads
  - first-launch steps for macOS (System Settings > Privacy & Security > Open Anyway) and Windows (SmartScreen: More info > Run anyway)
  - a pointer to the README
- `create-release` requests notes from the GitHub generate-notes API for the tag (`gh api repos/{owner}/{repo}/releases/generate-notes`). It appends them below the header and creates the draft with `gh release create --draft --verify-tag --title "hekate <version>" --notes-file <combined>`. It passes the release id to the build jobs.
- **Why**: the label and instructions are always present and reviewed like code. The changelog part needs no upkeep.
- **Alternative**: a hand-kept CHANGELOG.md. Better prose, but it's another step on every release.

### D6. Workflow permissions
- The only trigger is `push` of `v*` tags. No `pull_request_target` or `workflow_run`, so code from forks never runs with write access.
- Top-level `permissions: contents: read`. Only `create-release` and `build` get `contents: write`.
- Third-party actions (`tauri-apps/tauri-action`, `pnpm/action-setup`, the Rust toolchain action) are pinned to a full commit SHA, with the version in a comment. First-party `actions/*` are pinned to a major version.
- Recommended but not required (repo settings, done by the maintainer): a tag ruleset so only the maintainer can create `v*` tags.

### D7. Docs
- **README Download section**: a link to Releases, a platform table marking Windows and Linux UNVERIFIED, the macOS first-launch steps, the Windows SmartScreen steps and the WebView2 note, and a note that macOS builds aren't notarized by Apple, so each new version needs Open Anyway once and sandboxed-Mixxx users are asked for data access on each launch.
- **README Releasing section (for the maintainer)**: the bump / tag / review / publish steps, and what to do if one platform's build fails.

## Risks / Trade-offs

- **[Users with sandboxed Mixxx are asked for data access on every launch]** → The README and release notes say so up front. Reducing the prompts is left to the file-reading change (D4), and the Developer ID path stays open.
- **[macOS tightens Gatekeeper for unnotarized apps again]** → The README steps would need updating, and the Developer ID path (D4) stays open.
- **[One matrix job fails after others have uploaded]** → The release is still a draft, so nothing is public. Re-run the failed job from the Actions UI; it uploads to the same draft. The README Releasing section covers this.
- **[GitHub retires the chosen Ubuntu runner image]** → The workflow fails visibly. Move to the next oldest image and keep the label in one place in the matrix.
- **[The universal macOS build roughly doubles macOS CI time]** → Accepted. It only runs on releases.

## Migration Plan

1. Merge the workflow, header, config and README changes.
2. Push `v0.1.0`, the current version and never released, as the first release. Install the macOS build from the draft, test it, and publish.

Rollback: delete the draft release and the tag (`git push --delete origin v<x>`). After publishing, a bad release is deleted or edited from the Releases page. There are no installed updaters to recall.

## Open Questions

- Whether to also run the `verify` job on pull requests. Deferrable: it doesn't affect releases.
- Whether to add the tag ruleset (D6). It's a repo setting, so it can be done at any time.
