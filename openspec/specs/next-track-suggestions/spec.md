# next-track-suggestions Specification

## Purpose

Gives the DJ a ranked, scannable list of tracks that can follow the one playing, with the details needed to choose one in seconds.

## Requirements

### Requirement: List compatible next tracks
The system SHALL list every track in the current pool that has a compatible transition from the now-playing track. The now-playing track itself SHALL be excluded.

#### Scenario: Now-playing set
- **WHEN** a track is now-playing
- **THEN** the list contains exactly the pool tracks with a compatible transition from it

#### Scenario: No now-playing track
- **WHEN** no track is now-playing
- **THEN** the list is empty and prompts the user to set a now-playing track

#### Scenario: No compatible tracks
- **WHEN** no pool track is compatible with the now-playing track
- **THEN** the list says so and offers to widen the BPM tolerance

### Requirement: Default ranking
By default, the system SHALL rank suggestions by a combined score in which lower harmonic risk and smaller BPM gap, relative to the tolerance, count equally. The best suggestion SHALL come first.

#### Scenario: Equal BPM gap, different risk
- **WHEN** two candidates have the same BPM gap and different harmonic risk
- **THEN** the lower-risk candidate ranks higher

#### Scenario: Equal risk, different BPM gap
- **WHEN** two candidates have the same harmonic risk and different BPM gaps
- **THEN** the candidate with the smaller gap ranks higher

### Requirement: Re-sort by column
The system SHALL let the user sort the list by BPM gap or by harmonic risk instead of the default ranking.

#### Scenario: Sort by BPM gap
- **WHEN** the user sorts by BPM gap
- **THEN** suggestions are ordered from the smallest to the largest absolute BPM gap

### Requirement: Suggestion details
Each suggestion SHALL show the artist, title, Camelot key, BPM, signed BPM gap as a percentage, key move, mood effect, harmonic risk and any convention label. Half/double-time matches SHALL be marked.

#### Scenario: Suggestion row content
- **WHEN** the now-playing track is 8A at 125 BPM and a suggestion is 9A at 126 BPM
- **THEN** its row shows 9A, 126, +0.8%, move "+1", mood "darker" and its risk value

### Requirement: Played-tonight tracks are dimmed, not hidden
Suggestions that were played tonight SHALL stay in the list, appear visually dimmed, and be ordered after all not-yet-played suggestions.

#### Scenario: Played track among suggestions
- **WHEN** a compatible track was played earlier tonight
- **THEN** it appears dimmed, below every compatible track not yet played

### Requirement: Update with now-playing
The list SHALL refresh whenever now-playing, the BPM tolerance or the pool changes.

#### Scenario: Now-playing changes
- **WHEN** now-playing changes from track A to track B
- **THEN** the list shows suggestions for track B

### Requirement: Act on a suggestion
The system SHALL let the user set a suggestion as now-playing or as the request target directly from the list, using the mouse or the keyboard.

#### Scenario: Set suggestion as now-playing via keyboard
- **WHEN** the user selects a suggestion with the keyboard and triggers "set as now-playing"
- **THEN** that track becomes now-playing
