# Functional Module Model v1

## Purpose

This document defines the next architectural layer above the current engine.

It does not replace:

- `resources`
- `channels`
- `signals`
- `blocks`
- `alarms`
- `sequences`

It organizes them into reusable functional modules so the platform can scale from:

- replacing one failed element
- to replacing one subsystem
- to replacing the main controller of a mechanism

## Core Rule

The platform should not model a mechanism primarily by:

- pin type
- transport type
- vendor device type

The platform should model a mechanism by:

- function
- interface
- authority
- fallback behavior

This means a signal source may be:

- float switch
- lamp feedback
- `4-20 mA`
- local ADC
- Modbus register
- satellite node

But logic should only consume a normalized signal interface.

Likewise, a command target may be:

- relay output
- analog setpoint
- Modbus write
- reversible motor
- stepper motor
- positioner

But orchestration should only consume a normalized command capability.

## Relationship To The Existing Engine

The current runtime source of truth remains:

- `resource -> channel -> signal -> helper/block -> alarm/sequence/display`

`Functional Module Model v1` is a composition layer above that.

It should:

- reuse the existing engine
- publish stable module interfaces
- avoid hidden hardware channels
- keep `sequence` as the orchestration layer for complex mechanisms
- instantiate real lower-layer objects when a module is created:
  - blocks
  - signals
  - and, only when needed, channels

It should not:

- create a second runtime
- bypass signals as the common language
- replace the current low-level block vocabulary
- remain only a visual wrapper with no explicit generated lower-layer ownership
- introduce nested runtime execution where modules call blocks recursively

## Instantiation Rule

A module is not only a visual card.

A module must instantiate explicit lower-layer engine objects.

The preferred future path is:

- module template
- setup wizard
- generated blocks/signals/sequences
- published stable module interface

Reference:

- `docs/module-instantiation-and-setup-wizard-v1.md`

## Module Composition Rule

The composition chain should now be read explicitly as:

- `flow line`
  - consists of visible `modules` and `sequences`
- `module`
  - consists of owned/generated `blocks`
  - and may also own one `sequence`
- `block`
  - is either:
    - virtual/derived
    - or bound to normalized `signals`
- `signal`
  - is the common language between physical I/O, derived logic, alarms, display and sequence

This means:

- visible authoring should happen mainly at:
  - module level
  - sequence level
- but the instantiated source of truth must still remain:
  - `resources`
  - `channels`
  - `signals`
  - `blocks`
  - `alarms`
  - `sequences`

This also means:

- creating a module must not stop at adding a visual card
- creating a module must seed the real lower layer it depends on
- generated objects must remain traceable back to the owning module/template
- autogeneration must stay disciplined:
  - bind existing normalized objects before creating new ones
  - publish only outputs that are actually useful outside the module
  - avoid duplicate signals/channels/helper objects

## Authoring vs Runtime Rule

The composition ladder is an authoring model, not a recursive execution tree.

Visible authoring may look like:

- `flow line -> module -> block -> signal`

But runtime execution must stay flat:

- signals are updated once
- blocks are updated once
- sequences are updated once
- alarms and outputs are updated once

This means:

- modules own generated runtime objects
- modules expose interfaces
- modules do not form a second nested runtime scheduler

Reference:

- `docs/authoring-to-runtime-graph-v1.md`

## Display And Service Sourcing Rule

Future `Display` and `Service` UX should not depend on hidden module magic.

They should consume one of:

- stable module interface outputs
- owned sequence outputs
- selected generated block/signal values that were explicitly exposed by the module

This is required because later screen building should be able to insert:

- module statuses
- module values
- sequence states
- derived health/fault states

without forcing the user to rediscover the internal lower-layer object graph by hand.

## Stable Module Interface

Every functional module should expose a stable interface shape as appropriate for its role.

Typical published fields:

- `ready`
- `running`
- `busy`
- `done`
- `fault`
- `alarm`
- `value`
- `position`
- `in_range`
- `quality`
- `mode`
- `status_text`

## Capability-Based Outputs

Outputs should not be modeled only as named equipment types.

They should also advertise how they can be commanded.

Minimum capability direction:

- `discrete_onoff`
- `reversible_open_close`
- `analog_setpoint`
- `protocol_setpoint`
- `protocol_position`
- `stepper_position`
- `servo_position`

## Backend And Authority Model

The same module interface may be backed by different implementations.

Required direction:

- `internal_primary`
- `external_primary`
- `external_follow`
- `shadow`
- `fallback_takeover`

This is required because the platform goal is not only to monitor external devices.

The platform should also be able to replace them when needed.

## Universal Module Families

The preferred first-class families are:

- `Operator IO Module`
- `Measured Value Module`
- `On/Off Control Module`
- `PID Control Module`
- `Actuator Module`
- `Protocol Interface Module`
- `Sequence Module`
- `Alarm Policy Module`
- `Composite Module`

### Operator IO Module

Examples:

- pushbuttons
- selector switches
- lamp feedback
- local command stations

### Measured Value Module

Examples:

- temperature
- pressure
- level
- salinity / conductivity
- flow
- switch / limit state

### On/Off Control Module

Examples:

- boiler water level pump start/stop
- hysteresis control
- anti-chatter control

Important note:

- this family is separate from PID
- marine boiler water-level control is a key reference case
- anti-slosh and minimum on/off timing belong here

### PID Control Module

Examples:

- fuel temperature
- pressure loop
- modulating temperature loop

### Actuator Module

Examples:

- pump
- fan
- burner enable
- three-way valve
- damper
- future smart actuators

### Protocol Interface Module

Examples:

- external PID
- smart sensor
- Modbus device role
- future satellite node

### Sequence Module

Examples:

- burner start sequence
- purge sequence
- boiler coordinator

### Alarm Policy Module

Examples:

- trip groups
- lockout
- ack-required faults

### Composite Module

Examples:

- fuel preparation package
- burner package
- pump station
- full boiler coordinator

## Boiler v1 As The Pilot Reference

The marine auxiliary boiler remains the reference mechanism for this model.

Why:

- it contains both PID and non-PID control
- it contains simple contactor outputs and richer actuators
- it contains trips, permissives, feedback, alarms, fallback concerns, and sequence logic

Important clarification:

- boiler is a strong pilot reference
- boiler is not the primary product abstraction

The primary abstraction should remain:

- universal control patterns
- then module families
- then composite mechanisms

Reference:

- `docs/universal-control-pattern-library-v1.md`

## No Large Rewrite Required

This model does not require a major rewrite of completed work.

Current implementation still fits well.

Needed direction is:

- preserve the current engine
- add the module layer above it
- move future authoring/UI toward modules instead of raw objects

## Priority Architectural Adjustments

The following should now be treated as the most important refinements before a module-first UI grows too far:

1. formalize module interface conventions
2. formalize capability-based command targets
3. expand authority/fallback semantics beyond simple auto/manual/service
4. define a first-class PID module direction
5. keep sequence consuming module outputs instead of vendor-specific device details

## Rule For Future UI

Future UI layers should increasingly present:

- modules
- templates
- composites

while retaining access to:

- channels
- signals
- blocks
- sequences

for advanced work.
