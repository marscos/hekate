# Spec Delta

## Purpose

Gives hekate the user's tracks, crates and play history by reading an existing Mixxx library, without ever modifying it.

## ADDED Requirements

### Requirement: Locate the Mixxx library automatically
The system SHALL look for the Mixxx database in the platform's default Mixxx locations at startup, including the sandboxed macOS location, and use the first readable one it finds.

#### Scenario: Library found in the sandboxed macOS location
- **WHEN** the app starts on macOS and `mixxxdb.sqlite` exists under `~/Library/Containers/org.mixxx.mixxx/Data/Library/Application Support/Mixxx/`
- **THEN** the app loads the library from that file without asking the user for a path

#### Scenario: No library in default locations
- **WHEN** no readable Mixxx database exists in any default location
- **THEN** the app shows a screen explaining that no Mixxx library was found and offers to choose the database file manually

### Requirement: Choose the library file manually
The system SHALL let the user pick a Mixxx database file and SHALL remember the choice across app restarts.

#### Scenario: User picks a database file
- **WHEN** the user selects a valid Mixxx database file in the file picker
- **THEN** the app loads the library from it and uses the same file on the next launch

#### Scenario: User picks an invalid file
- **WHEN** the user selects a file that is not a Mixxx database
- **THEN** the app shows an error naming the file and keeps the previous library (if any)

### Requirement: Explain the macOS data-access prompt
On macOS, the system SHALL explain before its first read of another app's data folder that the operating system will ask for permission. If permission is denied, it SHALL offer the manual file picker.

#### Scenario: First launch on macOS
- **WHEN** the app is about to read Mixxx's sandboxed folder for the first time
- **THEN** the app first shows an explanation of the upcoming system permission prompt and why it is needed

#### Scenario: Permission denied
- **WHEN** the user denies the system permission prompt
- **THEN** the app explains how to grant access later and offers the manual file picker

### Requirement: Never modify the Mixxx library
The system MUST open the Mixxx database read-only and MUST NOT create, modify or delete anything in it or alongside it.

#### Scenario: Library unchanged after use
- **WHEN** the app has loaded the library and run for a full session
- **THEN** the Mixxx database and its directory contain no changes made by hekate

### Requirement: Work while Mixxx is running
The system SHALL read the library while Mixxx is running and writing to it, and SHALL recover from a temporarily locked database without user action.

#### Scenario: Database briefly locked
- **WHEN** a read happens while Mixxx is writing to the database
- **THEN** the app retries and completes the read, or tries again on its next scheduled read, without showing an error

### Requirement: Load tracks with BPM and canonical key
The system SHALL load each non-deleted track with its artist, title, duration, BPM and Camelot key. The key MUST come from Mixxx's canonical key identifier, not the notation-dependent key text.

#### Scenario: Mixed key notations in the library
- **WHEN** two tracks have the same canonical key but their key text is stored as `8B` and `C` respectively
- **THEN** both tracks are shown with Camelot key 8B

#### Scenario: Deleted track
- **WHEN** a track is marked deleted in Mixxx
- **THEN** the app does not load it

### Requirement: Report tracks unusable for mixing suggestions
The system SHALL treat tracks with no key or with no positive BPM as unusable for suggestions, the compass and routing, and SHALL show how many tracks were excluded.

#### Scenario: Unanalysed track
- **WHEN** a track has no detected key or a BPM of zero
- **THEN** it does not appear in suggestions, the compass or routes
- **AND** the app's excluded-track count includes it

### Requirement: Load crates and history playlists
The system SHALL load all Mixxx crates with their member tracks, and Mixxx's history playlists with their tracks in play order and timestamps.

#### Scenario: Crates available
- **WHEN** the library contains crates
- **THEN** each crate is available by name with its tracks

#### Scenario: History available
- **WHEN** the library contains history playlists
- **THEN** the most recent history playlist's tracks are available in the order they were played

### Requirement: Reload the library on demand
The system SHALL let the user reload the library so that tracks, crates and analysis changed in Mixxx become visible without restarting hekate.

#### Scenario: Crate edited in Mixxx
- **WHEN** the user adds a track to a crate in Mixxx and then reloads the library in hekate
- **THEN** hekate shows the track as a member of that crate
