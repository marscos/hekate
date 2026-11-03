# transition-glossary Specification

## Purpose

Explains, in plain language and where the user needs it, the terms hekate uses to describe a transition: key moves, harmonic risk, mood, convention badges and half/double time. The Camelot move names stay as they are.

## Requirements

### Requirement: Move meanings
The system SHALL define, for every key move it recognises, a one-line meaning and the number of the seven scale notes the two keys share. A meaning SHALL describe only how far the key moves and whether the mode changes. It SHALL NOT claim an energy or other perceived effect.

#### Scenario: Every move has a meaning
- **WHEN** any recognised move is shown (same, +1, −1, relative, diagonal, +2, −2, semitone up, semitone down, parallel)
- **THEN** a meaning and a shared-note count exist for it

#### Scenario: Shared notes match the keys
- **WHEN** the move is from 8A (A minor)
- **THEN** the shared notes are: same 7 of 7, +1 or −1 6 of 7, relative 7 of 7, diagonal 6 of 7, +2 or −2 5 of 7, semitone up or down 2 of 7, parallel 4 of 7

#### Scenario: Relative move explained
- **WHEN** the user looks up the relative move
- **THEN** its meaning says the notes stay the same and the mode swaps between minor and major

#### Scenario: Semitone move explained
- **WHEN** the user looks up semitone up
- **THEN** its meaning says the key moves up a half step with the same mode, and that it is 7 steps around the wheel

### Requirement: Explanations where move names appear
Wherever the system shows a move name (in the next-up list, on the compass slot labels and in the route steps), hovering over the name SHALL show that move's meaning and shared-note count. The compass details for the hovered or selected track SHALL show the meaning too, so it is also reachable by keyboard selection. Names SHALL stay unchanged.

#### Scenario: Next-up move column
- **WHEN** the user hovers over "diagonal" in a next-up row
- **THEN** the diagonal meaning and "6 of 7 notes shared" appear

#### Scenario: Compass slot label
- **WHEN** the user hovers over the "+2" slot label on the compass
- **THEN** the +2 meaning and "5 of 7 notes shared" appear

#### Scenario: Compass details
- **WHEN** the user hovers over or selects a compass node reached by a relative move
- **THEN** the details show the relative meaning alongside the move name

#### Scenario: Route step
- **WHEN** the user hovers over the move of a route step
- **THEN** that move's meaning and shared-note count appear

#### Scenario: Keyboard access
- **WHEN** the user selects a next-up row with the arrow keys
- **THEN** the compass details show that row's move name with its meaning

### Requirement: Glossary view
The system SHALL offer a glossary, opened from a control in the top bar and from the `?` key when no text field has focus. It SHALL list every move with its meaning and shared notes, and SHALL explain harmonic risk and its bands, mood, the convention badges and the half/double-time mark.

#### Scenario: Open from the top bar
- **WHEN** the user clicks the glossary control in the top bar
- **THEN** the glossary opens and lists every move with its meaning and shared-note count

#### Scenario: Open from the keyboard
- **WHEN** no text field has focus and the user presses `?`
- **THEN** the glossary opens

#### Scenario: Typing a question mark
- **WHEN** the track search field has focus and the user types `?`
- **THEN** the character goes into the field and the glossary does not open

#### Scenario: Other terms explained
- **WHEN** the glossary is open
- **THEN** it explains that risk measures how far apart the two keys are and names the safe, moderate and bold bands; that brighter means a major target key and darker a minor one; that ⚡ "+2 energy boost" and ↑ "semitone lift" are DJ convention names that do not change risk or mood; and that ½× marks a half/double-time match

#### Scenario: Close
- **WHEN** the glossary is open and the user presses Escape or clicks outside it
- **THEN** the glossary closes and nothing else changes

### Requirement: One definition per move
The meaning and shared-note count shown for a move SHALL be identical in the glossary and in every place the move name is explained.

#### Scenario: Same text everywhere
- **WHEN** the user reads the semitone-up explanation in the next-up list, on the compass, in a route step and in the glossary
- **THEN** the meaning and shared-note count are the same in each
