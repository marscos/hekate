# Spec Delta

## Purpose

Keeps hekate pointed at the track currently playing in Mixxx, automatically when possible and manually when not, and tracks what has already been played tonight.

## ADDED Requirements

### Requirement: Follow Mixxx automatically
While "Follow Mixxx" is on, the system SHALL set now-playing to the most recent track in Mixxx's latest history playlist, and SHALL update within about 2 seconds of Mixxx recording a new track.

#### Scenario: New track starts in Mixxx
- **WHEN** Follow Mixxx is on and Mixxx records a new track in its history
- **THEN** within about 2 seconds hekate shows that track as now-playing and updates suggestions, the compass and any active route

#### Scenario: No history yet
- **WHEN** Follow Mixxx is on and the latest history playlist is empty or absent
- **THEN** hekate shows no now-playing track and prompts the user to pick one manually

### Requirement: Set now-playing manually
The system SHALL let the user set any library track as now-playing at any time, by search or by selecting it in a view, and SHALL apply the change immediately.

#### Scenario: User sets a track by search
- **WHEN** the user searches for a track and sets it as now-playing
- **THEN** hekate immediately shows it as now-playing and updates suggestions, the compass and any active route

### Requirement: Automatic detection overrides a stale manual choice
While Follow Mixxx is on, a track that Mixxx records after a manual choice SHALL replace that choice as now-playing.

#### Scenario: Manual choice then Mixxx plays a new track
- **WHEN** the user manually sets track A as now-playing, and Mixxx later records track B
- **THEN** now-playing becomes track B

#### Scenario: Manual choice with no new history
- **WHEN** the user manually sets track A as now-playing and Mixxx records nothing new
- **THEN** now-playing stays track A

### Requirement: Turn automatic following off
The system SHALL provide a Follow Mixxx toggle. When it is off, now-playing SHALL change only through manual selection, and the app SHALL remain fully usable.

#### Scenario: Following disabled
- **WHEN** Follow Mixxx is off and Mixxx records a new track
- **THEN** now-playing does not change

#### Scenario: Automatic detection unavailable
- **WHEN** the history cannot be read (for example, history recording is disabled in Mixxx)
- **THEN** the user can still set now-playing manually, and suggestions, the compass and routing work normally

### Requirement: Track what was played tonight
The system SHALL treat the tracks in Mixxx's latest history playlist as played tonight, and SHALL update the set as new tracks are recorded.

#### Scenario: Track played earlier in the session
- **WHEN** a track appears in the latest history playlist
- **THEN** hekate marks it as played tonight in every view
