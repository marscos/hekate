# Spec Delta

## Purpose

How users get and update hekate: downloadable releases for each platform, installers that macOS opens after one confirmation per version, and honest labelling of what has been tested.

## ADDED Requirements

### Requirement: Downloadable releases for each platform
Each published release SHALL be available from the project's GitHub Releases page with an installer for macOS (one download for Apple Silicon and Intel), Windows, and Linux.

#### Scenario: Mac user downloads a release
- **WHEN** a user on an Apple Silicon or Intel Mac opens the latest release
- **THEN** a single macOS disk image is listed that installs and runs on their Mac

#### Scenario: Windows or Linux user downloads a release
- **WHEN** a user on Windows or Linux opens the latest release
- **THEN** an installer for their platform is listed (a Windows installer; a Linux AppImage and a Debian package)

### Requirement: Releases are built from tested, tagged source
A release SHALL only be produced from a version tag whose source passes the project's automated tests and type checks. A failing check SHALL stop the release before any installer is attached.

#### Scenario: Tests fail on a tagged commit
- **WHEN** a version tag is pushed and any automated test or type check fails
- **THEN** no release installers are produced for that tag

### Requirement: Releases are reviewed before publication
A new release SHALL first appear as a draft visible only to maintainers. It SHALL become public only when a maintainer publishes it.

#### Scenario: Build completes
- **WHEN** all installers for a tag have been built and attached
- **THEN** the release is a draft and is not shown to visitors until a maintainer publishes it

### Requirement: Version consistency
The version a user downloads SHALL match the version the installed app reports. A tag SHALL NOT produce a release if the version numbers in the source disagree with it.

#### Scenario: Matching versions
- **WHEN** a user installs the release tagged `v0.2.0`
- **THEN** the installed app and its installer file name both report version `0.2.0`

#### Scenario: Mismatched tag
- **WHEN** a tag `v0.2.0` is pushed but the source declares a different version
- **THEN** no release is produced and the failure names the mismatched version

### Requirement: Intact macOS signature
Every macOS release SHALL carry a complete, valid code signature over the whole app bundle, so macOS lets the user open it after confirming, rather than reporting it as damaged.

#### Scenario: Signature is intact after download
- **WHEN** a user downloads the macOS disk image and copies hekate to Applications
- **THEN** macOS does not report the app as damaged

### Requirement: First-launch guidance
Each release's notes and the README SHALL explain how to open hekate the first time on each platform, including confirming an app that is not notarized by Apple on macOS and allowing an unrecognised app on Windows.

#### Scenario: macOS blocks the first launch
- **WHEN** a user opens a downloaded hekate and macOS says it cannot verify the app
- **THEN** the release notes and README give the steps to allow it from System Settings without using a terminal, and say this is needed once for each new version

#### Scenario: macOS asks for data access on each launch
- **WHEN** a user whose Mixxx library is in Mixxx's sandboxed folder opens hekate
- **THEN** the release notes and README have already told them that macOS asks for data access each time hekate opens, and that allowing it is safe

### Requirement: Untested platforms are labelled
Each release SHALL mark builds for platforms the maintainer has not tested as UNVERIFIED, in its release notes and in the README's download section. Currently these are Windows and Linux.

#### Scenario: Viewing a release
- **WHEN** a user reads a release's notes
- **THEN** the Windows and Linux downloads are clearly labelled UNVERIFIED before the list of changes

### Requirement: Updates are manual
hekate SHALL NOT check for, download or install updates by itself. Users get a new version by downloading it from GitHub Releases.

#### Scenario: New release published
- **WHEN** a newer release is published while a user is running an older version
- **THEN** the running app makes no network request and shows no update prompt, and the user can install the new version by downloading it
