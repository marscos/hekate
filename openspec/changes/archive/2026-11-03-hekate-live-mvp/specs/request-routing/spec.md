# Spec Delta

## Purpose

Lets the DJ honour a request by planning the shortest chain of compatible transitions from the track that's playing to the requested one, kept current as the set unfolds.

## ADDED Requirements

### Requirement: Choose a request target
The system SHALL let the user search the whole library and choose any usable track as the request target, including tracks outside the current pool.

#### Scenario: Request from outside the pool
- **WHEN** the pool is limited to one crate and the user requests a track that is not in it
- **THEN** the track is accepted as the request target

#### Scenario: Clear the request
- **WHEN** the user clears the request target
- **THEN** no route is shown

### Requirement: Fewest-tracks route
The system SHALL find a route from the now-playing track to the request target in which every step is a compatible transition and the number of tracks is as small as possible.

#### Scenario: Direct transition available
- **WHEN** the request target has a compatible transition from the now-playing track
- **THEN** the route goes straight from the now-playing track to the target

#### Scenario: Multi-step route
- **WHEN** the target is not directly compatible but is reachable through other tracks
- **THEN** the route has the fewest possible intermediate tracks, each compatible with the next

### Requirement: Lower risk breaks ties
When several routes have the fewest tracks, the system SHALL choose the one with the lowest total harmonic risk.

#### Scenario: Two equally short routes
- **WHEN** two routes have the same number of tracks and different total risk
- **THEN** the lower-risk route is shown

### Requirement: Route membership rules
Intermediate tracks SHALL come from the current pool and SHALL NOT include tracks played tonight, the now-playing track, or any track more than once.

#### Scenario: Played track would shorten the route
- **WHEN** the only shorter route passes through a track played tonight
- **THEN** that track is not used, and a route avoiding it is shown instead

### Requirement: No route available
When no route exists under the current rules, the system SHALL say so and offer to widen the BPM tolerance.

#### Scenario: Unreachable target
- **WHEN** no chain of compatible transitions connects the now-playing track to the target
- **THEN** the app states that no route was found and offers to widen the tolerance

### Requirement: Reroute when now-playing changes
Whenever now-playing changes, the system SHALL update the route. If the new track is on the route, the route continues from it; otherwise a new route is calculated from it.

#### Scenario: DJ follows the route
- **WHEN** now-playing changes to the next track on the route
- **THEN** the route is shown from that track onward

#### Scenario: DJ leaves the route
- **WHEN** now-playing changes to a track not on the route
- **THEN** a new fewest-tracks route is calculated from the new track

#### Scenario: Request reached
- **WHEN** now-playing becomes the request target
- **THEN** the request is marked as reached and the route is cleared

### Requirement: Route summary
The system SHALL show the route as an ordered list of tracks with each step's key move and BPM gap. It SHALL also show the number of tracks and an estimated time to reach the target, based on track durations.

#### Scenario: Route summary shown
- **WHEN** a route with three intermediate tracks exists
- **THEN** the app lists the three tracks in order with their moves and BPM gaps, and shows the track count and estimated time

### Requirement: Route on the wheel map
The system SHALL show a Camelot-wheel map of the pool. Each track SHALL be positioned by key (ring for A or B, sector for the number) and by BPM within its ring. The current route SHALL be drawn on top.

#### Scenario: Map with route
- **WHEN** a route exists
- **THEN** the wheel map shows all pool tracks plus the target (even when it is outside the pool), highlights the now-playing track and the target, and draws the route's steps between them

#### Scenario: Stable map
- **WHEN** the map is re-rendered with the same pool and tolerance
- **THEN** every track keeps its position
