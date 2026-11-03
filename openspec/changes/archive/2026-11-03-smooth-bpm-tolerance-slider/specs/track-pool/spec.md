# Spec Delta

## ADDED Requirements

### Requirement: Stable pool picker width
The pool picker in the top bar SHALL keep the same width whatever the selection is called, so choosing a different pool does not move the other top-bar controls. A name too long for the picker SHALL be truncated, and the full name SHALL be shown on hover.

#### Scenario: Switching between pools
- **WHEN** the user switches the pool from the whole library to a crate called "Crate", then to two crates
- **THEN** the pool picker, the track search, the Follow Mixxx toggle and the BPM slider stay in the same place

#### Scenario: Long crate name
- **WHEN** the selected crate's name is longer than the picker can show
- **THEN** the picker shows the start of the name, cut off, together with the pool size, and hovering over it shows the full name
