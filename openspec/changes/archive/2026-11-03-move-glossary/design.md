# Design

## Context

See proposal.md (Why). The relevant current state:

- `MOVE_LABEL` in `src/lib/engine/camelot.ts` is the single source of move names. `CONVENTION_LABEL` in `transition.ts` holds the two convention names. The compass draws ⚡ for +2 and ↑ for semitone up.
- Move names are rendered in four places:
  - the next-up `Move` cell (`next-up-list.svelte`)
  - the compass slot labels: SVG `<text>` in an overlay that is `pointer-events-none` and `aria-hidden`
  - the compass details card: `pointer-events-none`, following hover or `selectedId`
  - the route steps (`route-summary.svelte`)
- The compass, wheel map and next-up list are all on screen at once (`+page.svelte`). The next-up list is a `listbox` driven by arrow keys, and selection is linked to the compass.
- The shadcn-svelte `tooltip` and `popover` components are installed. `tooltip` is not used anywhere yet, so no `Tooltip.Provider` is mounted.
- Risk bands are in `riskBand` (`format.ts`): safe < 0.35 ≤ moderate < 0.7 ≤ bold.
- Shortcuts are handled per component with `<svelte:window onkeydown>` and a "typing in a field" guard (`track-search.svelte`).

## Goals / Non-Goals

**Goals:**
- One data definition per move, used by every explanation and by the glossary.
- Explanations on hover at each move-name site, and keyboard reach through linked selection.
- A glossary that is always one click or one key away.

**Non-Goals:**
- Renaming moves, or a setting to switch wordings.
- Explaining terms that are not about transitions (pool, follow Mixxx, library status).
- Localisation.

## Decisions

### D1. `MOVE_INFO` beside `MOVE_LABEL`
Add `MOVE_INFO: Record<Move, { meaning: string; sharedNotes: number }>` to `camelot.ts`. Typing it as a `Record` over `Move` makes a missing move a compile error. The shared-note counts are hard-coded, and a unit test checks them against real scales: build the pitch-class set of each Camelot key, then count the notes shared with every move's target from all 24 keys. The counts don't depend on the starting key, so one number per move is correct.

Draft meanings. The final wording is settled in implementation, but must stay within D9: key distance, mode and shared notes only.

| Move | Meaning | Shared |
|---|---|---|
| same | Same key: nothing changes harmonically. | 7 |
| +1 | Up a fifth, one step clockwise. Same mode. | 6 |
| −1 | Down a fifth, one step anticlockwise. Same mode. | 6 |
| relative | Same notes, other mode: minor and major swap. | 7 |
| diagonal | One step around the wheel and a swap between minor and major. | 6 |
| +2 | Up a whole tone, two steps clockwise. Same mode. | 5 |
| −2 | Down a whole tone, two steps anticlockwise. Same mode. | 5 |
| semitone up | Up a half step: 7 steps clockwise (5 anticlockwise). Same mode. | 2 |
| semitone down | Down a half step: 7 steps anticlockwise (5 clockwise). Same mode. | 2 |
| parallel | Same root note, other mode (e.g. A minor to A major). | 4 |

- **Alternative**: compute shared notes at runtime from the two keys. Rejected: the number is a property of the move and never varies, so a constant checked by a test is simpler to read.

### D2. A `MoveLabel` component for hover explanations
A small component renders `MOVE_LABEL[move]` as the trigger of a shadcn `Tooltip`. The content shows the meaning and "N of 7 notes shared". It is used in the next-up cell and in route steps. Mount one `Tooltip.Provider` near the root of `+page.svelte`, with a short open delay so passing the pointer across the table doesn't flash tooltips.

The trigger is not a tab stop. The next-up rows are listbox options, and nested focus targets would break the arrow-key model. Keyboard users reach the meaning through D4 and the glossary. The meaning is also exposed as the trigger's accessible description, so screen readers announce it.

- **Alternative**: native `title` attributes. Rejected: slow and unstyled, and the text couldn't be laid out (meaning plus notes).

### D3. Compass slot labels move to an HTML layer
The slot labels move out of the `aria-hidden`, pointer-less SVG overlay into absolutely positioned HTML elements, placed at the same computed coordinates above the unovis layer, each rendered with `MoveLabel`. The rings, axis and side labels stay in the SVG. The labels sit at `LABEL_RADIUS` 1.1, outside the outer ring, so they don't cover nodes.

- **Alternative**: an SVG `<title>` on each `<text>`. Rejected: it needs pointer events on the overlay anyway, gives only the native delayed tooltip, and can't match the other sites (D2).
- **Alternative**: a single tooltip attached to the whole overlay that picks the nearest slot. Rejected: it means hit-testing logic for no gain.

### D4. Compass details show the meaning
The details card gets a line with `MOVE_INFO[move].meaning`. The card already follows hover and `selectedId`, and selection is linked to the next-up list, so arrow-key selection there shows the meaning. This is the keyboard path the spec requires.

### D5. Glossary as a popover in the top bar
A `?` icon button in the top bar opens a shadcn `Popover` that holds the glossary. It is a popover rather than a dialog so it stays light and closes on Escape or an outside click, without covering the whole app mid-set. A `<svelte:window onkeydown>` handler opens it on `?` with the same typing guard as `track-search.svelte`.

Contents:
- **Moves**: grouped in pairs (±1, ±2, semitone up/down), each listing name, meaning and shared notes from `MOVE_INFO`.
- **Risk**: how far apart the two keys are, with the safe, moderate and bold band thresholds taken from `riskBand`.
- **Mood**: brighter means a major target, darker a minor one.
- **Badges**: ⚡ "+2 energy boost" and ↑ "semitone lift" are DJ convention names that don't change risk or mood. The names come from `CONVENTION_LABEL`.
- **½×**: a half/double-time BPM match.

The badge glyphs are currently a local function in `compass.svelte`. Move them to a shared constant beside `CONVENTION_LABEL` so the compass and the glossary can't disagree.

- **Alternatives**:
  - A dialog: heavier, and it takes over the screen.
  - A separate route or page: leaves the live view.
  - A side sheet: no sheet component is installed, and it takes width the compass needs.

## Risks / Trade-offs

- [Tooltips flicker while scanning the next-up table] → An open delay on the provider (D2), and only the Move cell triggers a tooltip, not the whole row.
- [HTML slot labels drift from the SVG rings on resize] → They use the same `cx`, `cy` and `scale` derivations as today's SVG text. Verify visually at both breakpoints.
- [Glossary text starts implying effects, for example "smooth" or "energy"] → Unit-test that no `MOVE_INFO` meaning contains a list of banned words (energy, lift, boost, smooth, tension). The convention names are exempt because they are quoted as conventions.
- [`?` conflicts with a future shortcut, or with keyboard layouts where `?` needs Shift] → Match on `e.key === "?"`, which is layout-independent, and use the same typing guard as the search shortcut.
