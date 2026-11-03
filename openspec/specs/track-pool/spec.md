# track-pool Specification

## Purpose

Lets the DJ narrow hekate's candidates to tonight's music by choosing Mixxx crates, so suggestions and routes draw only from that pool.

## Requirements

### Requirement: Whole library by default
When no crates are selected, the pool SHALL be every usable track in the library.

#### Scenario: Fresh start
- **WHEN** the user has never selected crates
- **THEN** suggestions, the compass and route intermediates draw from the whole library

### Requirement: Select crates as the pool
The system SHALL let the user select one or more Mixxx crates. While any are selected, the pool SHALL be the union of their usable tracks.

#### Scenario: Two crates selected
- **WHEN** the user selects crates "D" and "E"
- **THEN** the pool contains every usable track that belongs to either crate, each counted once

### Requirement: Pool applies everywhere
The pool SHALL limit the next-up list, the compass, the wheel map and route intermediates. It SHALL NOT limit request target selection or manual now-playing selection.

#### Scenario: Track outside the pool
- **WHEN** a compatible track is not in the selected crates
- **THEN** it does not appear in the next-up list, the compass or as a route intermediate
- **AND** it can still be chosen as now-playing or as the request target

### Requirement: Remember the pool
The system SHALL remember the selected crates across app restarts. If a remembered crate no longer exists in the library, it SHALL be ignored.

#### Scenario: Restart
- **WHEN** the user selects crates, quits and relaunches the app
- **THEN** the same crates are selected

#### Scenario: Crate deleted in Mixxx
- **WHEN** a remembered crate no longer exists after a library reload
- **THEN** it is dropped from the selection and the remaining crates stay selected

### Requirement: Show pool size
The system SHALL show how many usable tracks are in the current pool.

#### Scenario: Pool changes
- **WHEN** the user changes the crate selection
- **THEN** the displayed pool size updates
