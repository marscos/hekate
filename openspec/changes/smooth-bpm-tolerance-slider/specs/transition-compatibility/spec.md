# Spec Delta

## ADDED Requirements

### Requirement: Responsive tolerance control
While the user drags the BPM tolerance control, the control and its displayed value SHALL follow the pointer without lagging behind it. Suggestions, the compass and routes SHALL keep updating during the drag using the most recent value, and SHALL skip intermediate values rather than process every step in turn.

#### Scenario: Dragging across the range
- **WHEN** the user drags the tolerance control from ±6% to ±10% in one continuous motion
- **THEN** the control and the displayed tolerance move with the pointer through the intermediate values, without jumping in bursts

#### Scenario: Views follow the drag
- **WHEN** the user pauses mid-drag at ±8%
- **THEN** suggestions, the compass and any route reflect ±8%

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
