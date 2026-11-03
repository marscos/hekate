# Spec Delta

## Purpose

Shows at a glance how each possible next track would change the atmosphere: darker or brighter, safe or risky, and which way around the wheel. The layout is stable, so it can be read under pressure.

## ADDED Requirements

### Requirement: Centre on now-playing
The compass SHALL place the now-playing track at its centre and show the pool tracks with a compatible transition from it around it.

#### Scenario: Now-playing set
- **WHEN** a track is now-playing
- **THEN** it appears at the centre and its compatible pool tracks appear around it

#### Scenario: No now-playing track
- **WHEN** no track is now-playing
- **THEN** the compass shows an empty state prompting the user to set one

### Requirement: Side encodes mood
The compass SHALL place candidates in a minor key on the left side, labelled "darker", and candidates in a major key on the right side, labelled "brighter".

#### Scenario: Major candidate
- **WHEN** the now-playing track is 8A and a candidate is 8B
- **THEN** the candidate appears on the right ("brighter") side

#### Scenario: Minor candidate
- **WHEN** the now-playing track is 8A and a candidate is 9A
- **THEN** the candidate appears on the left ("darker") side

### Requirement: Distance encodes harmonic risk
A candidate's distance from the centre SHALL increase with the transition's harmonic risk, so safer transitions sit closer to the centre. The compass SHALL show risk rings to make the distance readable.

#### Scenario: Safe versus risky candidate
- **WHEN** one candidate is a +1 move and another is a semitone move
- **THEN** the semitone candidate appears further from the centre than the +1 candidate

### Requirement: Angle encodes wheel direction
Within each side, clockwise moves around the Camelot wheel SHALL be placed above the horizontal axis and counter-clockwise moves below it. Every move type SHALL keep a fixed position (slot).

#### Scenario: Opposite directions
- **WHEN** candidates are a +1 move and a −1 move
- **THEN** the +1 candidate appears above the horizontal axis and the −1 candidate below it

### Requirement: Stable layout
For the same now-playing track, pool and tolerance, the compass SHALL place every track in the same position every time. Nothing SHALL move unless the underlying data changes.

#### Scenario: Re-render without data change
- **WHEN** the compass is re-rendered with the same inputs
- **THEN** every node keeps its position, with no animation or drift

### Requirement: Tracks within a slot
Tracks sharing a move slot SHALL be ordered by BPM gap, smallest nearest the slot's centre. Beyond a per-slot limit, the slot SHALL show how many tracks were left out.

#### Scenario: Crowded slot
- **WHEN** more tracks share a slot than the per-slot limit
- **THEN** the slot shows the limit's worth of tracks with the smallest BPM gaps and an overflow count for the rest

### Requirement: Convention badges
Candidates whose move carries a convention label (such as "+2 energy boost") SHALL show it as a badge on the compass.

#### Scenario: Energy boost candidate
- **WHEN** a candidate is a +2 move
- **THEN** its node shows a "+2 energy boost" badge

### Requirement: Track details on hover or selection
Hovering over or selecting a candidate SHALL show its artist, title, key, BPM, BPM gap, move, mood effect and risk.

#### Scenario: Hover a node
- **WHEN** the user hovers over a candidate node
- **THEN** its details are shown

### Requirement: Linked selection with the next-up list
Selecting a track in the compass SHALL highlight it in the next-up list, and selecting a track in the list SHALL highlight it in the compass.

#### Scenario: Select in compass
- **WHEN** the user selects a candidate in the compass
- **THEN** the same track is highlighted in the next-up list

### Requirement: Played-tonight candidates are dimmed
Candidates played tonight SHALL appear dimmed in the compass.

#### Scenario: Played candidate
- **WHEN** a candidate was played earlier tonight
- **THEN** its node is dimmed
