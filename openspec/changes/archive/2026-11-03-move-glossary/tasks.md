# Tasks

## 1. Move definitions

- [x] 1.1 Add `MOVE_INFO` (meaning and shared-note count per move) to `src/lib/engine/camelot.ts`, using the wording from design D1. Verify with `camelot.test.ts`: every `Move` has an entry; the shared-note count matches the count derived from real pitch-class sets for every move from all 24 keys; the relative meaning mentions the mode swap and same notes; the semitone meanings mention the half step and 7 steps; and no meaning contains energy, lift, boost, smooth or tension.
- [x] 1.2 Move the compass badge glyphs (⚡ for +2, ↑ for semitone up) into a shared constant beside `CONVENTION_LABEL` in `transition.ts`, and use it in `compass.svelte`. Verify the existing compass and transition tests still pass, and that the badges look unchanged in the app.

## 2. Hover explanations

- [x] 2.1 Build a `MoveLabel` component: the move name as a tooltip trigger, with the meaning and "N of 7 notes shared" as content and as the trigger's accessible description. Mount one `Tooltip.Provider` with a short open delay in `+page.svelte` (design D2). Verify with a component test that the accessible description holds the meaning and the shared-note count, and that the visible text is still the original move name.
- [x] 2.2 Use `MoveLabel` in the next-up `Move` cell and in the route steps. Verify with component tests: in `next-up-list.test.ts`, the Move cell still shows the original label (the existing "semitone lift" assertion keeps passing) and exposes the meaning; in a route-summary test, each step exposes its move's meaning.
- [x] 2.3 Move the compass slot labels into an HTML layer above the unovis graph, at the same coordinates, each rendered with `MoveLabel`. Keep rings, axis and side labels in the SVG (design D3). Verify in `pnpm tauri dev` at both the default and `2xl` widths that the labels line up with their slots as before, that hovering a label shows its explanation, and that nodes stay clickable and hoverable.
- [x] 2.4 Add the move meaning to the compass details card (design D4). Verify with a component test that selecting a suggestion shows its meaning in `compass-details`, and manually that arrow-key selection in the next-up list updates it.

## 3. Glossary

- [x] 3.1 Build the glossary popover component: moves grouped in pairs with name, meaning and shared notes from `MOVE_INFO`; risk with the band thresholds from `riskBand`; mood; the convention badges from the shared constants; and ½× (design D5). Verify with a component test that every move name appears with its meaning, the three risk bands are named, and both convention names appear with the statement that they don't change risk or mood.
- [x] 3.2 Add the `?` button to `top-bar.svelte` and a `?` key handler with the typing guard. Verify with component tests: clicking the button opens the glossary; pressing `?` with no field focused opens it; typing `?` in the track search puts the character in the field and leaves the glossary closed; and Escape closes it.

## 4. Integration check

- [x] 4.1 In `pnpm tauri dev` with a real library, a now-playing track and a request set: hover a move in each of the next-up list, compass slot labels and route steps, and confirm the same meaning appears for the same move everywhere and in the glossary. Confirm no label, badge, risk value or ordering changed. Run `pnpm test` and `pnpm check` and confirm both pass.

## Workflow follow-up

- Archive `hekate-live-mvp` before or alongside this change, so the capabilities it builds on exist under `openspec/specs/`.
