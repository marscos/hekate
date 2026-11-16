# cover-art Specification

## Purpose

Gives hekate each track's album cover, taken from the cover Mixxx found for it, without ever modifying the Mixxx library or the audio files, and without letting a missing or unreadable cover get in the DJ's way.

## Requirements

### Requirement: Use the cover Mixxx found
The system SHALL use the cover that Mixxx has recorded for each track, whether it is embedded in the audio file or is an image file Mixxx associated with the track. A track that Mixxx records as having no cover SHALL have none in hekate.

#### Scenario: Embedded cover
- **WHEN** Mixxx records that a track's cover is embedded in its audio file
- **THEN** hekate shows the image embedded in that file

#### Scenario: Cover image file
- **WHEN** Mixxx records that a track's cover is an image file, such as `cover.jpg` in the track's folder
- **THEN** hekate shows that image file

#### Scenario: No cover
- **WHEN** Mixxx records no cover for a track
- **THEN** hekate shows no cover image for it

#### Scenario: Library without cover information
- **WHEN** the Mixxx database has no cover information at all
- **THEN** the library loads normally and no track has a cover

### Requirement: Colour placeholder first
Wherever a cover is shown, the system SHALL show the cover's dominant colour, as recorded by Mixxx, until the image is ready, and SHALL then replace it with the image. Loading a cover SHALL NOT delay, resize or move anything else on screen.

#### Scenario: Cover still loading
- **WHEN** a track with a cover is shown and its image is not ready yet
- **THEN** its dominant colour is shown in the cover's place, and every other element is already in its final position

#### Scenario: Cover ready
- **WHEN** the image becomes ready
- **THEN** it replaces the colour in the same place and size

### Requirement: Unavailable covers fall back silently
When a cover cannot be read, the system SHALL keep showing its dominant colour, or nothing if no colour is known, and SHALL NOT show an error or interrupt the user. This applies to a missing file, an unmounted drive, access refused by the operating system and an unreadable image.

#### Scenario: Drive unplugged
- **WHEN** a track's file is on a drive that is not connected and its cover has never been shown
- **THEN** its dominant colour is shown and no error appears

#### Scenario: Access refused
- **WHEN** macOS refuses hekate access to the folder or volume holding a track's file
- **THEN** its dominant colour is shown and no error appears

#### Scenario: Corrupt image
- **WHEN** a track's embedded cover cannot be decoded
- **THEN** its dominant colour is shown and no error appears

### Requirement: Covers are cached by hekate
The system SHALL keep a small copy of each cover it has read in its own cache folder, and SHALL show the cached copy without reading the audio file again. When Mixxx records a different cover for a track, the system SHALL show the new cover.

#### Scenario: Cached cover with drive unplugged
- **WHEN** a track's cover was shown earlier and its drive is now unplugged
- **THEN** the cover is still shown

#### Scenario: Cover changed in Mixxx
- **WHEN** the user changes a track's cover in Mixxx and hekate reloads the library
- **THEN** hekate shows the new cover, not the cached old one

### Requirement: Never modify the library or audio files
The system MUST open audio files and cover image files read-only, and MUST NOT create, modify or delete anything in the Mixxx library, in the audio files, or in their folders. Cached covers SHALL be stored only in hekate's own cache folder.

#### Scenario: Files unchanged after reading covers
- **WHEN** hekate has shown the covers of tracks in a folder
- **THEN** the audio files, cover image files and that folder contain no changes made by hekate

### Requirement: File-access prompts appear at setup time
On macOS, after each library load or reload, the system SHALL read one track file from each location that macOS may protect separately: each connected volume and each top-level folder in the user's home folder. It SHALL do this in the background so that any macOS file-access prompts appear while the user is setting up.

#### Scenario: Library on a USB drive
- **WHEN** the library loads, its tracks are on a connected USB drive, and hekate has not been granted access to removable volumes
- **THEN** macOS asks for removable-volume access straight after the library loads, before any cover is shown

#### Scenario: Library spread across locations
- **WHEN** the library's tracks are in `~/Music`, `~/Downloads` and on a connected USB drive
- **THEN** hekate reads one file from each of those three locations after the library loads

#### Scenario: Library stays usable during the check
- **WHEN** a macOS prompt from this check is waiting for an answer
- **THEN** the library, suggestions, the compass and routing work normally

#### Scenario: Drive connected later
- **WHEN** a drive holding library tracks was not connected at the first load, and is connected before a later reload
- **THEN** hekate reads one file from that drive after the reload

#### Scenario: Not every folder is read
- **WHEN** a location holds tracks in hundreds of folders
- **THEN** the check reads one file from that location, not one per folder

### Requirement: No extra permission requests
The system SHALL NOT explain the file-access prompts beforehand, and MUST NOT ask the user to grant Full Disk Access. The prompts SHALL come only from reading the user's own track files.

#### Scenario: First launch with tracks on a USB drive
- **WHEN** hekate starts for the first time with tracks on a USB drive
- **THEN** no hekate screen about the prompt is shown, and macOS's own prompt is the only one that appears
