# Proposal

## Why

Dragging the BPM tolerance slider in the top bar stutters: the thumb jumps around under the pointer. A DJ widening the tolerance mid-set, for example after a "no compatible tracks" or "no route" message, should get a control that tracks their hand.

The main cause is layout shift. The "±x%" readout next to the slider shrinks to its text, so "±5%" is 25 px wide and "±5.5%" 36 px. The slider track takes the rest of a fixed-width box, so on every half step the track's length changes by about 11 px. The thumb moves under the pointer, which bits-ui reads as a new value. The same kind of shift happens in the top bar's pool picker: its width follows the crate name, which pushes the search, Follow toggle and slider sideways by up to ~50 px when the pool changes.

A second cause is the cost of each update. The thumb's position is bound to the session's tolerance, so it can only move once everything that depends on tolerance has been recomputed: transitions, ranking, the route, the next-up table and the compass. Measured on the 640-track synthetic library, an update costs ~15 ms without a request and ~170 ms with one. Each step also writes the preference to localStorage.

## What Changes

- The "±x%" readout keeps a fixed width, so the slider track keeps its position and length whatever value is shown.
- The pool picker keeps a fixed width, truncating long crate names (the full name stays available on hover), so the top bar doesn't shift when the pool changes.
- The slider thumb and the "±x%" readout follow the pointer on every frame while dragging, independent of the downstream recomputation.
- While dragging, suggestions and the compass update with the latest value, at most once per animation frame. Intermediate values that arrive in between are dropped, not queued.
- A route to a request keeps its previous tolerance until the drag ends, then recomputes once.
- When the drag ends, every view, including the route, updates to the final value. The tolerance preference is saved only at that point, not on every step.
- Single-step changes (click on the track, keyboard arrows) behave as today: the views update immediately and the value is saved.
- No change to the tolerance range (±1–10%), step (0.5%), default (±6%) or what tolerance means.

Out of scope: making the routing or compass recomputation itself cheaper. If profiling on the real library later shows a single step is still too slow, that becomes its own change.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `transition-compatibility`: adds requirements on how the adjustable BPM tolerance control responds while it is being dragged (including a stable track), and when the chosen value is saved.
- `track-pool`: adds a requirement that the pool picker keeps a fixed width whatever the selection's name.

## Impact

- **Code**: `src/lib/components/top-bar/top-bar.svelte` (the slider binding and readout) and `pool-picker.svelte` (fixed width). Possibly a small helper for frame-coalesced updates, and `src/lib/state/session.svelte.ts` if tolerance updating and saving get split.
- **Tests**: component or state tests for coalescing and saving on commit. A manual drag check in `pnpm tauri dev`.
- **Dependencies**: none new. It relies on the existing bits-ui `Slider` (`onValueChange` / `onValueCommit`).
- **Specs**: two ADDED requirements in `transition-compatibility` (responsive control, when the value is saved) and one in `track-pool` (stable picker width).
