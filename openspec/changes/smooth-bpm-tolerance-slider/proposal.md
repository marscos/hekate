# Proposal

## Why

Dragging the BPM tolerance slider in the top bar stutters: the thumb lags behind the pointer and jumps in bursts. Single steps (a click or an arrow key) are smooth. A DJ widening the tolerance mid-set, for example after a "no compatible tracks" or "no route" message, should get a control that tracks their hand.

The thumb's position is bound to the session's tolerance, so it can only move once everything that depends on tolerance has been recomputed. That covers transitions, ranking, the route (a full graph build plus search when a request is set), the next-up table and the compass. The compass alone costs a ~70 ms task per update. Each step also writes the preference to localStorage. One step fits within a frame or two. A drag sends steps faster than they can be processed, so they pile up.

## What Changes

- The slider thumb and the "±x%" readout follow the pointer on every frame while dragging, independent of the downstream recomputation.
- While dragging, the views update with the latest value, at most once per animation frame. Intermediate values that arrive in between are dropped, not queued.
- When the drag ends, the views update to the final value. The tolerance preference is saved only at that point, not on every step.
- Single-step changes (click on the track, keyboard arrows) behave as today: the views update immediately and the value is saved.
- No change to the tolerance range (±1–10%), step (0.5%), default (±6%) or what tolerance means.

Out of scope: making the routing or compass recomputation itself cheaper. If profiling on the real library later shows a single step is still too slow, that becomes its own change.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `transition-compatibility`: adds a requirement on how the adjustable BPM tolerance control responds while it is being dragged, and when the chosen value is saved. The capability is introduced by `hekate-live-mvp`, which is not archived yet. Archive that change first so this delta lands on top of it.

## Impact

- **Code**: `src/lib/components/top-bar/top-bar.svelte` (the slider binding and readout). Possibly a small helper for frame-coalesced updates, and `src/lib/state/session.svelte.ts` if tolerance updating and saving get split.
- **Tests**: component or state tests for coalescing and saving on commit. A manual drag check in `pnpm tauri dev`.
- **Dependencies**: none new. It relies on the existing bits-ui `Slider` (`onValueChange` / `onValueCommit`).
- **Specs**: two ADDED requirements in `transition-compatibility` (responsive control, when the value is saved).
