# transition-compatibility Specification

## Purpose

Defines when one track can follow another and what that transition does musically: the key move, the BPM fit, the harmonic risk and the mood effect. These rules drive suggestions, the compass and routing.

## Requirements

### Requirement: Recognise Camelot key moves
The system SHALL classify the key relationship from one track to another as one of these moves: same key, +1, −1, relative, diagonal, +2, −2, semitone up, semitone down, or parallel. Any other relationship SHALL count as no move.

#### Scenario: Adjacent move
- **WHEN** the current track is 8A and a candidate is 9A
- **THEN** the move is +1

#### Scenario: Relative move
- **WHEN** the current track is 8A and a candidate is 8B
- **THEN** the move is relative

#### Scenario: Diagonal move
- **WHEN** the current track is 8A and a candidate is 9B or 7B
- **THEN** the move is diagonal

#### Scenario: Semitone move
- **WHEN** the current track is 8A and a candidate is 3A
- **THEN** the move is semitone up

#### Scenario: Parallel move
- **WHEN** the current track is 8A (A minor) and a candidate is 11B (A major)
- **THEN** the move is parallel

#### Scenario: Unrelated keys
- **WHEN** the current track is 8A and a candidate is 2A
- **THEN** there is no move, and the candidate is not compatible

### Requirement: BPM tolerance
The system SHALL treat two tracks as BPM-compatible when their tempos differ by no more than the tolerance, measured as a percentage. The tolerance SHALL default to ±6% and be adjustable by the user.

#### Scenario: Within default tolerance
- **WHEN** the tolerance is ±6% and the tracks are 124 and 128 BPM
- **THEN** they are BPM-compatible

#### Scenario: Outside tolerance
- **WHEN** the tolerance is ±6% and the tracks are 120 and 130 BPM
- **THEN** they are not BPM-compatible

#### Scenario: User narrows the tolerance
- **WHEN** the user sets the tolerance to ±3%
- **THEN** compatibility, suggestions, the compass and routes update to use ±3%

### Requirement: Half and double time
The system SHALL also treat two tracks as BPM-compatible when one tempo is within tolerance of half or double the other, and SHALL mark such matches as half/double time.

#### Scenario: Double-time match
- **WHEN** the tolerance is ±6% and the tracks are 87 and 174 BPM
- **THEN** they are BPM-compatible and marked as half/double time

### Requirement: Compatible transitions
The system SHALL consider a transition compatible only when the tracks are related by a recognised key move and are BPM-compatible.

#### Scenario: Key fits but tempo does not
- **WHEN** the tracks are 8A at 100 BPM and 9A at 125 BPM, with ±6% tolerance
- **THEN** the transition is not compatible

### Requirement: Harmonic risk score
The system SHALL give each compatible transition a harmonic risk from 0 (safest) to 1 (riskiest), derived from listener-based key-distance data. Risk SHALL depend only on the two keys and be the same in both directions.

#### Scenario: Same key is safest
- **WHEN** risk is computed for every move from a given key
- **THEN** the same-key move has the lowest risk

#### Scenario: Close moves are safer than semitone moves
- **WHEN** risk is computed from 8A
- **THEN** +1, −1 and relative each have lower risk than semitone up and semitone down

#### Scenario: Symmetric
- **WHEN** risk is computed from 8A to 9A and from 9A to 8A
- **THEN** both values are equal

### Requirement: Mood effect of a move
The system SHALL describe each transition's mood effect by the target key's mode: a major target is "brighter" and a minor target is "darker". The effect SHALL be stated as fact, without hedging.

#### Scenario: Minor to major
- **WHEN** the current track is 8A and the candidate is 8B
- **THEN** the transition's mood effect is "brighter"

#### Scenario: Staying minor
- **WHEN** the current track is 8A and the candidate is 9A
- **THEN** the transition's mood effect is "darker"

### Requirement: Convention labels
The system SHALL label moves that DJ practice names with a technique (such as "+2 energy boost" and "semitone lift") using those labels. These labels SHALL NOT change risk or mood.

#### Scenario: Energy boost label
- **WHEN** the current track is 8A and the candidate is 10A
- **THEN** the transition carries the label "+2 energy boost"

### Requirement: Keylock assumption
The system SHALL assume keylock is on, so a track's key does not change with tempo adjustments.

#### Scenario: Large tempo difference within tolerance
- **WHEN** a candidate would need to be pitched by 5% to match tempo
- **THEN** its key for compatibility purposes is still its analysed key

### Requirement: Responsive tolerance control
While the user drags the BPM tolerance control, the control and its displayed value SHALL follow the pointer without lagging behind it. Suggestions and the compass SHALL keep updating during the drag using the most recent value, skipping intermediate values rather than processing every step in turn. A route to a request SHALL keep its previous tolerance until the drag ends.

#### Scenario: Track stays put as the value changes
- **WHEN** the displayed tolerance changes from ±5% to ±5.5%
- **THEN** the slider track keeps its position and length, so the thumb stays under the pointer

#### Scenario: Dragging across the range
- **WHEN** the user drags the tolerance control from ±6% to ±10% in one continuous motion
- **THEN** the control and the displayed tolerance move with the pointer through the intermediate values, without jumping in bursts

#### Scenario: Views follow the drag
- **WHEN** the user pauses mid-drag at ±8%
- **THEN** suggestions and the compass reflect ±8%

#### Scenario: Route waits for the release
- **WHEN** a request is set and the user drags the tolerance from ±6% to ±8% without releasing it
- **THEN** the route and its "no route" message still use ±6%, and they switch to ±8% when the user releases the control

#### Scenario: Release settles on the final value
- **WHEN** the user releases the control at ±9.5%
- **THEN** suggestions, the compass and any route use ±9.5%, whatever intermediate values were skipped

#### Scenario: Single step
- **WHEN** the user changes the tolerance by one step with a click or an arrow key
- **THEN** suggestions, the compass and any route update to the new value straight away

### Requirement: Tolerance is remembered once chosen
The system SHALL save the BPM tolerance when the user finishes changing it, and restore it on the next launch. Intermediate values passed while dragging SHALL NOT be saved.

#### Scenario: Value kept after a drag
- **WHEN** the user drags the tolerance to ±4%, releases it and restarts the app
- **THEN** the tolerance is ±4%

#### Scenario: Value kept after a single step
- **WHEN** the user changes the tolerance from ±6% to ±6.5% with an arrow key and restarts the app
- **THEN** the tolerance is ±6.5%
