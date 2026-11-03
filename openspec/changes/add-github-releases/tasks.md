# Tasks

## 1. macOS signing spike

- [x] 1.1 Write a spike script that creates a self-signed code-signing certificate (CN `hekate release signing`, `extendedKeyUsage = codeSigning`, about 10 years' validity) and exports a password-protected `.p12`, never inside the repo. Verify: `openssl pkcs12 -info` on the output shows the CN and the code-signing usage, macOS `SecPKCS12Import` accepts it, and `git status` is clean. (The script was removed in 1.5, after the spike rejected the approach.)
- [x] 1.2 Set `bundle.macOS.signingIdentity: "-"` in `src-tauri/tauri.conf.json`. Verify: after `pnpm tauri build`, `codesign -dv` on the `.app` shows `Identifier=com.marscos.hekate` and sealed resources, `codesign --verify --deep --strict` passes, and a copy quarantined with `xattr -w com.apple.quarantine` shows "Apple could not verify…", not "damaged".
- [x] 1.3 Check locally whether the permission is kept. Sign two versions (0.1.0, 0.1.1) with the certificate and confirm `codesign -d -r-` shows `certificate leaf = H"…"` for both with different CDHashes. Quarantine both `.dmg`s, install by dragging in Finder (no App Translocation), allow access to Mixxx's sandboxed folder, relaunch, then replace with the second. Result: macOS asked for the permission on every launch, even for the same build, and Gatekeeper needed Open Anyway for each version. The self-signed approach was rejected (design D4).
- Task 1.4 (signing with the self-signed certificate on a GitHub runner) was not needed: 1.3 rejected the approach, and the maintainer chose ad-hoc signing (design D4, fallback A).
- [x] 1.5 Record the spike outcome in design.md D4, update the proposal and specs/distribution (replacing "Stable macOS identity across releases" with "Intact macOS signature" and adding the per-launch prompt to "First-launch guidance"), and remove the certificate script, its README section and the signed workflow step. Verify: design.md D4 states the result, `openspec validate add-github-releases --strict` passes, `actionlint` passes, and the workflow references no secrets.

## 2. Single version number

- [x] 2.1 Change `version` in `src-tauri/tauri.conf.json` to `"../package.json"`. Verify: after `pnpm tauri build`, the `.app`'s `Info.plist` `CFBundleShortVersionString` and the dmg file name both show `package.json`'s version.
- [x] 2.2 Add a version check script under `scripts/`. It compares a tag name argument (with `v` stripped), `package.json`'s version and `src-tauri/Cargo.toml`'s `[package] version`. It exits non-zero with a message naming each value when they differ (D3). Verify: it passes for `v0.1.0`, fails for `v0.2.0` with all three values named, and fails when `Cargo.toml` alone is changed.

## 3. Release workflow and docs

- [x] 3.1 Write `.github/release-notes-header.md` (D5) with:
  - the UNVERIFIED notice for Windows and Linux
  - macOS first-launch steps through System Settings > Privacy & Security > Open Anyway, with no terminal
  - the Windows SmartScreen steps (More info > Run anyway)
  - a link to the README Download section

  Verify: the file covers each of these, and the macOS steps need no terminal command.
- [x] 3.2 Create `.github/workflows/release.yml` with the `v*` tag trigger, top-level `permissions: contents: read`, and the `verify` job (D1, D6). The job runs the version check from 2.2 against `GITHUB_REF_NAME`, `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm check`, and `cargo test --manifest-path src-tauri/Cargo.toml` (with the Linux WebKit dependencies installed). Verify: `actionlint` reports no errors, and every third-party action is pinned to a commit SHA.
- [x] 3.3 Add the `create-release` job (`needs: verify`, `contents: write`). It builds the notes from the header (with `<version>` filled in) plus the generate-notes API output, creates a draft through the releases API, and outputs the release id (D5). Verify: `actionlint` passes and the job's commands read only the tag and the header file.
- [x] 3.4 Add the `build` matrix job (`needs: create-release`, `contents: write`) using `tauri-apps/tauri-action` with the runners and args from D2, uploading to the draft's release id, with the updater JSON and signatures off. Install both macOS Rust targets for the universal build. Verify: `actionlint` passes, and the workflow references no repository secrets.
- [ ] 3.5 Add the README Download section (D7):
  - a link to Releases
  - a platform table with Windows and Linux marked UNVERIFIED
  - the macOS first-launch steps (once per new version), the "not notarized by Apple" note, and the per-launch data-access prompt for sandboxed Mixxx
  - the Windows SmartScreen steps and the WebView2 note
  - a sentence saying updates are manual

  Finish the Releasing section with the bump, tag, review and publish steps, and with re-running a failed platform job. Verify: following the Releasing steps as written produces the dry run in 3.6.
- [ ] 3.6 Dry-run the workflow with a throwaway version. On a branch, bump `package.json` and `Cargo.toml` to `0.1.0-rc.1`, then push tag `v0.1.0-rc.1`. Verify:
  - a draft release appears with `hekate_0.1.0-rc.1_universal.dmg`, the Windows `-setup.exe`, the `.AppImage` and the `.deb`
  - its notes start with the header, followed by the generated notes
  - the release is not visible when logged out
  - pushing a tag `v9.9.9` on the same commit fails in `verify`, names the mismatched versions, and creates no draft

  Afterwards, delete both drafts, both tags and the branch.

## 4. First release

- [ ] 4.1 Push tag `v0.1.0` from `main`. Then download the draft's dmg onto an Apple Silicon Mac and install it. Verify:
  - macOS does not call it damaged
  - Open Anyway works as the notes describe
  - the app's About / `Info.plist` version is `0.1.0`
  - hekate loads the Mixxx library after its permission explanation
  - with network monitoring on (e.g. Little Snitch or `nettop`), hekate makes no connection

  Then publish the release.

## Workflow follow-up

- At the next release after `v0.1.0`, install it over `v0.1.0` on a Mac that has already granted access, and confirm macOS doesn't ask again. This is the "Updating keeps the data-access permission" scenario for real.
- Archive the change once 4.1 is done and the follow-up check above has passed, or after the spec has been revised to match what was found.
