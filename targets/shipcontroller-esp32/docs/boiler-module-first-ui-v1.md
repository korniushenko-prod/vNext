# Boiler Module-First UI v1

## Purpose

This document turns the boiler pilot module map into a concrete user-facing UI target.

It describes the first realistic mechanism-level UX that should prove the module-first direction.

## Boiler User Journey

### Step 1: Create Boiler Mechanism

User action:

- choose `New Mechanism`
- choose `Boiler`

Result:

- platform creates a mechanism shell
- seeds standard boiler modules
- opens the boiler workspace

### Step 2: Bind Real Inputs And Outputs

User action:

- open each seeded module
- bind real resources

Examples:

- fuel temp from analog transmitter
- flame feedback from digital input
- fan relay on digital output
- burner permissive from external resource

### Step 3: Tune Control Behavior

User action:

- set thresholds
- set PID tuning
- set hysteresis
- set min on/off timers
- set trip/alarm policies

### Step 4: Review Operation View

User action:

- confirm that the boiler looks understandable as a mechanism

### Step 5: Review Service View

User action:

- confirm that current state, reason, and health are understandable

### Step 6: Open Logic Only If Needed

User action:

- open module internals
- open sequence flow
- open advanced mappings

## Boiler Workspace Layout

### Top Bar

Should show:

- mechanism name
- current mode
- overall state
- active alarms
- save/apply controls

### Left Pane: Module Library And Mechanism Tree

Should show:

- boiler mechanism
- module groups
- add-module action
- add-composite action

Suggested groups:

- Operator
- Fuel
- Air
- Burner
- Water Level
- Water Chemistry
- Alarm / Trips
- Sequence

### Center Pane: Active View

Tabs:

- `Operation`
- `Service`
- `Logic`

### Right Pane: Inspector

Should change with current selection.

## Operation View

Goal:

- mechanism readable at a glance

Should show:

- fuel temperature state
- fan state
- burner state
- water level state
- feed pump state
- active sequence state
- active trips/permissives

Must avoid:

- raw config object language
- internal signal IDs as the main content

## Service View

Goal:

- explain current behavior

Should show:

- sequence state
- waiting reason
- fault reason
- pending transition
- module health/freshness
- critical input/output truth table

## Logic View

Goal:

- allow engineering changes without leaving the mechanism workspace

Should show:

- module cards
- module links
- ability to open:
  - module settings
  - module alarms
  - sequence internals
  - advanced low-level mappings

## Boiler Critical Module Cards

### Fuel Temperature Module Card

Must show:

- measured temperature
- ready/not ready
- low temperature alarm
- source/backend
- PID authority if active

### Feed Pump Control Module Card

Must show:

- level-derived request
- hysteresis summary
- anti-slosh / min on/off summary
- blocked/fault state

### Fan Module Card

Must show:

- command state
- run feedback
- startup timeout status

### Burner Module Card

Must show:

- command state
- flame prove state
- burner fault

### Damper Module Card

Must show:

- current capability type
- position/feedback
- moving/ready/fault

### Boiler Sequence Card

Must show:

- current state
- waiting reason
- fault reason
- pending transition

## Boiler Pilot Acceptance Criteria

The boiler pilot module-first UI is good enough when:

1. a normal service engineer can understand the mechanism without opening raw tabs first
2. mixed source types do not break the mental model
3. mixed actuator backends do not break the mental model
4. internal vs external PID authority is understandable
5. feed-water level control clearly feels like on/off hysteresis logic, not fake PID
6. advanced engineering depth is still reachable

## Relationship To Lower Layers

The boiler workspace should not replace:

- Channels
- Signals
- Blocks
- Alarms
- Sequences

It should orchestrate them.

Every boiler module should still map back to the existing engine so advanced edits remain possible.
