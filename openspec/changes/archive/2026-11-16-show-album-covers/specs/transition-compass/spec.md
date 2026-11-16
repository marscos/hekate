# Spec Delta

## MODIFIED Requirements

### Requirement: Track details on hover or selection
Hovering over or selecting a candidate SHALL show its cover, artist, title, key, BPM, BPM gap, move, mood effect and risk.

#### Scenario: Hover a node
- **WHEN** the user hovers over a candidate node
- **THEN** its details are shown

#### Scenario: Candidate with a cover
- **WHEN** the user hovers over or selects a candidate that has a cover
- **THEN** its details show the cover alongside the text

#### Scenario: Candidate without a cover
- **WHEN** the user hovers over or selects a candidate that has no cover
- **THEN** its details show the text with the same layout and position as for a candidate with a cover

## ADDED Requirements

### Requirement: Now-playing cover at the centre
The centre node SHALL show the now-playing track's cover, and its key SHALL stay readable. When the track has no cover, the centre node SHALL look as it does without covers.

#### Scenario: Now-playing track with a cover
- **WHEN** the now-playing track has a cover
- **THEN** the centre node shows the cover and the track's key

#### Scenario: Now-playing track without a cover
- **WHEN** the now-playing track has no cover
- **THEN** the centre node shows the track's key as it does today

#### Scenario: Now-playing changes
- **WHEN** now-playing changes to another track
- **THEN** the centre node shows the new track's cover, or its colour while the cover loads, and no candidate node moves because of the cover
