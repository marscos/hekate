# Tasks

## 1. Session: apply without saving

- [x] 1.1 Split tolerance updates in `Session` so that a value can be applied without writing the preference (for drag updates). `setTolerance` keeps applying and saving for the existing callers, including both "widen tolerance" actions in `src/routes/+page.svelte`. Verify with `session.svelte.test.ts`: an unsaved apply updates `suggestions` but leaves the stored preference unchanged, and `setTolerance` still saves it ("remembers the tolerance" keeps passing).

- [x] 1.2 Hold the route's tolerance during a drag (design D5): add `routeTolerance` to `Session`, changed only by `setTolerance`, derive the route from it, and pass it to the route summary in `src/routes/+page.svelte`. Verify with `session.svelte.test.ts`: with a request set, `previewTolerance` changes suggestions but leaves the route and `routeTolerance` as they were, and `setTolerance` then updates the route.

## 2. Frame-coalesced updates

- [x] 2.1 Add a small helper that keeps only the latest pending value and applies it once after the next paint (`requestAnimationFrame` then a zero-delay task), with `cancel` to drop a waiting value (used on commit and on teardown). Inject the schedulers so it can be tested (design D2). Verify with unit tests using fake timers: several values within one frame apply once with the last value, a value pushed between the frame and the task is the one applied, and `cancel` stops a pending apply.

## 3. Top-bar slider

- [x] 3.1 Bind the slider and the "±x%" readout to a local draft value that re-syncs from `session.tolerance` whenever no drag is in progress (design D1). Send `onValueChange` through the coalescing helper as unsaved applies. On `onValueCommit`, cancel any waiting update and call `setTolerance` so the final value is applied and saved (D3, D4). Cancel the helper on unmount. Verify with a component test: a commit saves the value and updates the readout, and an external `setTolerance` (as from "widen") moves the readout.
- [x] 3.3 Give the "±x%" readout a fixed width that cannot shrink (design D0). Verify in the browser pane that the slider track's left edge and width are identical for every value from ±1% to ±10%.
- [x] 3.4 Give the pool picker a fixed width, truncating the name with the full label on hover and keeping the pool size visible (design D0). Verify in the browser pane that switching between the whole library, a short crate name and two crates leaves the search, Follow toggle and slider in place, and that a long crate name is truncated with its full name in the tooltip.
- [ ] 3.2 Manual check in `pnpm tauri dev`, with a request target set and the compass visible: dragging across the full range keeps the thumb and readout under the pointer with no bursts, the list and compass keep updating during the drag, releasing settles every view on the released value, a single arrow-key step updates at once, and the released value survives a restart. Repeat once with no request set. Run `pnpm test` and `pnpm check` and confirm both pass.

## Workflow follow-up

- `hekate-live-mvp` is archived, so the `transition-compatibility` and `track-pool` deltas apply on top of the main specs.
