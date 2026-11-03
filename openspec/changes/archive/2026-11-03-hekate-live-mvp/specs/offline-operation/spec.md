# Spec Delta

## Purpose

Guarantees hekate works fully in a booth with no internet and never sends data anywhere. Everything it needs ships with the app.

## ADDED Requirements

### Requirement: Fully functional without network
Every feature of the app SHALL work with no network connection.

#### Scenario: Launch with networking disabled
- **WHEN** the computer has no network connection and the user launches hekate
- **THEN** the app loads, reads the library, and all views and features work normally

### Requirement: No network requests
The app MUST NOT make any network request at any time, including for fonts, icons, updates, telemetry or crash reporting.

#### Scenario: Monitored session
- **WHEN** network traffic is monitored during a full session (launch, library load, now-playing changes, routing)
- **THEN** hekate makes no outbound connection

### Requirement: Remote content is blocked
The app's interface SHALL refuse to load any resource from a remote origin, so a missing bundled asset cannot quietly fall back to the network.

#### Scenario: Remote resource referenced
- **WHEN** the interface attempts to load a resource from a remote URL
- **THEN** the load is blocked
