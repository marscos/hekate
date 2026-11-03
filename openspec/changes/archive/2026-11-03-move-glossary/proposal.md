# Proposal

## Why

hekate labels every transition with its Camelot move name: same, +1/−1, relative, diagonal, +2/−2, semitone up/down, parallel. These names say where the target sits on the wheel, not what changes musically. Users who don't think in Camelot can't tell what "diagonal" means, and "semitone up" (+7 on the wheel) is confusing even to those who do. Renaming the moves is not the answer. The effects that hekate can state with evidence, mode (brighter/darker) and key distance (risk), are already shown separately (MVP design D9), and the Camelot names are what DJs already know. What's missing is a link from each name to its meaning, available where the name appears.

## What Changes

- Every place a move name appears gets a short explanation on hover: the next-up "Move" column, the compass slot labels and the route steps. The compass details card, which follows hover and selection (including arrow-key selection in the next-up list), shows the meaning as well. The explanation says what the move does to the key (how far it moves, whether the mode changes) and how many of the seven scale notes the two keys share.
- A glossary opens from a "?" button in the top bar (and the `?` key outside text fields). It lists every move with its meaning and shared notes, and explains the other transition terms: risk and its bands (safe/moderate/bold), mood (brighter = major, darker = minor), the convention badges ("+2 energy boost" ⚡, "semitone lift" ↑) and the half/double-time mark (½×).
- One shared definition per move feeds both the explanations and the glossary, so they can't drift apart.
- No move is renamed and there is no setting to switch wordings. Existing labels, badges, risk, mood and ordering are unchanged.
- The wording stays within what D9 supports. Explanations describe key distance, mode and shared notes. They make no claims about energy or perceived effect, and convention badges are described as DJ conventions, not effects.

## Capabilities

### New Capabilities
- `transition-glossary`: Plain-language explanations of the terms hekate uses to describe a transition (key moves, risk, mood, convention badges, half/double time). Covers the in-context explanation of move labels and the glossary view.

### Modified Capabilities
<!-- None. The existing requirements in next-track-suggestions, transition-compass and request-routing keep their labels and content. This change only adds explanations, owned by the new capability. -->

## Impact

- **Code**:
  - `src/lib/engine/camelot.ts`: a per-move definition (meaning, shared-note count) next to `MOVE_LABEL`.
  - The move-label render sites in `next-up-list.svelte`, `compass.svelte` and `route-summary.svelte`.
  - A new glossary component and its button in `top-bar.svelte`.
- **UI dependencies**: the existing shadcn-svelte `tooltip` (not used anywhere yet, so it needs its provider mounted) and `popover`. No new packages.
- **Tests**: unit tests for the move definitions (every move covered, shared-note counts checked against the actual scales) and component tests for the explanations and the glossary.
- **Relationship**: builds on capabilities introduced by `hekate-live-mvp`, which is not archived yet. This change doesn't modify their requirements.
