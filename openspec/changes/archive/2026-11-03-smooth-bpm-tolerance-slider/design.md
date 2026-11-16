# Design

## Context

See proposal.md (Why) for the symptom. The relevant current state:

- `top-bar.svelte` passes `value={session.tolerance * 100}` to the bits-ui `Slider` and calls `session.setTolerance(v / 100)` from `onValueChange`. The thumb's position is therefore derived from session state.
- `Session.setTolerance` sets `tolerance` and writes the `bpmTolerance` preference to localStorage on every call.
- `session.transitions`, `suggestions` and `route` are `$derived` from `tolerance`. With a request set, `rerouteFrom` always falls through to `findRoute`, because now-playing has not moved. That means a full `buildGraph` over the pool plus Dijkstra on every change.
- The compass pushes new data to unovis on every change. The MVP design (Open Questions) measured a compass update at about one 70 ms task with ~80 nodes.
- bits-ui fires `onValueChange` on each pointer-move step and `onValueCommit` on pointer-up and on each keyboard step.
- Two other callers change the tolerance: the "widen tolerance" actions in `src/routes/+page.svelte` (next-up empty state and no-route state). They must keep working and keep saving the value.

## Goals / Non-Goals

**Goals:**
- The thumb and readout repaint on every frame during a drag, even when one downstream update takes longer than a frame.
- Downstream work runs at most once per frame during a drag, always with the latest value.
- localStorage is written once per user decision, not once per step.

**Non-Goals:**
- Making `findRoute`, `buildGraph` or the compass update cheaper.
- Moving routing to a worker.
- Changing the slider's range, step, or look.

## Decisions

### D0. Fixed widths for the readout and the pool picker
The "±x%" readout gets `shrink-0` alongside its existing `w-10`. Today it is a shrinkable flex item, so it collapses to its text (25 px for "±5%", 36 px for "±5.5%") and the slider track's length jumps by ~11 px on every half step. That moves the thumb under the pointer and is the stutter users see. At `text-xs` monospace the widest value, "±9.5%", is 36 px, so `w-10` (40 px) fits every value.

The pool picker gets a fixed width with the crate name truncated (`truncate`, the full label in `title`) and the pool size kept visible. Its width ranged from 118 px ("Crate · 154") to 171 px ("Whole library · 620"), and because the now-playing area is the top bar's only flexible item, every change pushed the controls to its left sideways.

- **Why**: layout shift was the cause the user actually perceived; the update-cost work (D1–D5) keeps the control responsive once it stays still.
- **Alternative**: right-align the readout in a container sized by its widest value. Same result with more markup.

### D1. The slider owns a local draft value
The top bar keeps a local `draft` (in percent) bound to the slider, and the readout shows `draft`. When no drag is in progress, `draft` follows `session.tolerance`, so the "widen tolerance" actions and the value restored at launch still move the thumb.

- **Why**: the thumb no longer waits on the derivation chain. It repaints as soon as bits-ui updates its value.
- **Alternative**: keep the slider bound to `session.tolerance` and only make downstream work cheaper. Rejected: any slow downstream step would still hold the thumb back.

### D2. Coalesce updates and run them after the next paint
`onValueChange` stores the latest value as pending. If no update is scheduled, it schedules one: `requestAnimationFrame` followed by a zero-delay task. That task applies the pending value to the session. Values that arrive before it runs overwrite the pending one, so only the newest value is computed.

- **Why**: running the heavy update inside the `requestAnimationFrame` callback itself would delay that frame's paint, and the thumb would stutter again. Waiting until after the paint lets the thumb's new position reach the screen first. At most one downstream update is in flight per frame, and it always uses the latest value.
- **Alternatives**:
  - Debounce until the pointer stops: the views would freeze for the whole drag, which the spec rules out.
  - Fixed-interval throttle: not tied to painting, so it can still land in the middle of a frame. It also needs a tuned interval.
  - Update only on commit: same problem as debounce.

### D3. Applying a value and saving it are separate session operations
`Session` gets a way to set the tolerance without saving it, used for the coalesced drag updates. Saving happens in `onValueCommit` (pointer-up and keyboard steps) and in the "widen" actions. A commit also cancels any pending coalesced update and applies the committed value at once, so the views end exactly on the released value.

- **Why**: this satisfies "saved once chosen" without debouncing localStorage writes inside `Session`, and keeps the existing callers' behaviour (apply and save) as the default.
- **Alternative**: debounce `writePreference` inside `setTolerance`. Rejected: it hides a timing behaviour inside state, where a test or the "widen" action wouldn't expect it.

### D4. Keyboard and click steps stay immediate
A keyboard step fires both `onValueChange` and `onValueCommit`. The commit path applies the value immediately (D3), so single steps don't wait a frame.

### D5. The route holds its tolerance during a drag
`Session` keeps a second value, `routeTolerance`, which only `setTolerance` (a commit or a "widen" action) changes. `previewTolerance` leaves it alone. The route derives from `routeTolerance`, and the route summary's "no route at ±x%" message shows it too, so the message always matches the route on screen.

- **Why**: measured in the dev build with the 640-track synthetic library, a view update costs ~15 ms without a request and ~170–210 ms with one. `findRoute` accounts for only ~20 ms of that; the rest is the route-dependent re-rendering. Holding the route removes all of it from the drag. A DJ adjusting tolerance cares about the route's result once they let go, not about each intermediate route.
- **Alternatives**:
  - Make route updates cheaper: worth doing, but it's a separate investigation (where the ~150 ms outside `findRoute` goes) and wouldn't guarantee one frame per update.
  - Compute routes in a worker: a bigger architectural change, for the same reason out of scope here.

## Risks / Trade-offs

- [A single drag update is still slower than a frame on a much larger library] → Measured at ~15 ms with the route held (D5). Profiling on the real library (MVP task 8.1) decides whether a follow-up should make the compass or list cheaper.
- [The draft and the session drift apart, for example if a commit is lost when the pointer leaves the window] → bits-ui also commits on `pointerleave`. In addition, `draft` re-syncs from `session.tolerance` whenever no drag is active.
- [A pending update fires after the component unmounts] → Cancel the scheduled frame and task on teardown.
- [Testing frame timing in jsdom is awkward] → Put the coalescing logic in a small pure helper that takes injectable schedulers, and unit-test it with fake timers. The drag feel is checked manually in the app.
