# Module-First UI Spec v1

## Purpose

This document defines the next user-facing UI layer above the current object-first engine screens.

It is built to match:

- `docs/functional-module-model-v1.md`
- `docs/boiler-pilot-module-map-v1.md`
- `docs/visual-editor-strategy-v1.md`
- `docs/logic-ownership-matrix-v1.md`
- `docs/universal-control-pattern-library-v1.md`
- `docs/pattern-first-ui-reorganization-v1.md`

The goal is not to remove:

- `Channels`
- `Signals`
- `Blocks`
- `Alarms`
- `Sequences`

The goal is to let most users start from:

- a function
- a mechanism
- a module template

and only drop into the lower layers when needed.

Important implementation rule:

- creating a module should not stop at adding a visual card
- module creation must go through guided instantiation
- that instantiation should auto-create real lower-layer objects as needed

Reference:

- `docs/module-instantiation-and-setup-wizard-v1.md`

Important clarification:

- this layer should become pattern-first and universal
- not boiler-first
- boiler remains only a strong pilot mechanism for validation

The UI should progressively move toward the registry model defined in:

- `docs/module-registry-spec-v1.md`

## Product Rule

The module-first UI should make the product feel like:

- configure a mechanism
- connect modules
- understand runtime state

not:

- manually edit disconnected configuration fragments

## Main User Modes

The module-first layer should expose three views over the same mechanism.

### 1. Operation View

Target role:

- operator
- quick service

Purpose:

- show the mechanism as a working machine
- provide clear start/stop/reset and key state visibility

Typical content:

- mimic-like layout
- major module states
- active permissives / trips
- key values
- active alarms

### 2. Service View

Target role:

- commissioning
- maintenance

Purpose:

- explain why the mechanism is in its current state

Typical content:

- current state
- waiting reason
- fault reason
- pending transition
- active timers
- key module inputs and outputs
- communication / freshness / health

### 3. Logic View

Target role:

- engineer
- advanced commissioning

Purpose:

- edit the mechanism model

Typical content:

- module list
- module connections
- sequence state flow
- module template settings
- advanced path into channels / signals / blocks / alarms / sequences

## Core Module-First Screens

### 1. Module Library

Purpose:

- add a new functional module from a known family

Families:

- `Operator IO`
- `Measured Value`
- `On/Off Control`
- `PID Control`
- `Actuator`
- `Protocol Interface`
- `Sequence`
- `Alarm Policy`
- `Composite`

The library should first ask:

- what function is being added

and only later:

- what transport
- what hardware backend

### 2. Module Card

The default visible unit should be a module card.

Every module card should show:

- module label
- module family
- template
- current runtime status
- mode / authority
- health / fault
- key outputs

Every module card should offer:

- `Open`
- `Service`
- `Alarms`
- `Display`
- `Advanced`

### 3. Module Inspector

Purpose:

- configure the selected module in detail

Shared sections:

- identity
- template
- source/backend
- authority mode
- inputs
- outputs
- alarms/trips
- service text
- advanced mapping

### 3a. Module Setup Wizard

Before a module appears as configured, the user should go through a setup wizard that:

- collects required bindings
- autofills common defaults
- previews what objects will be created
- validates missing or conflicting fields
- then instantiates real blocks/signals/sequences

The wizard should make the lower layer visible enough to trust, without forcing the user to build it by hand.

Meaning:

- a module card is never only decorative
- the wizard must explain what it is about to generate
- after creation, the module inspector must show:
  - generated signals
  - generated blocks
  - owned sequence if one exists
  - published outputs
  - values/statuses exposed for `Display` and `Service`

### 4. Module Connections View

Purpose:

- show how modules depend on each other

The preferred first model is structured links, not a fully free freeform canvas.

Flow lines should be understood as:

- modules and sequences at the visible layer
- blocks and signals inside modules

And the next return path to this screen should respect one fixed rule:

- adding a module should instantiate the lower layer
- editing a module should keep generated-object traceability
- display/runtime screens should be able to use selected generated outputs without manual reconstruction

Examples:

- `fuel_temp.ready -> boiler_sequence.permissive`
- `fan.running -> burner_sequence.permissive`
- `burner.fault -> boiler_trip.active`

This connections view should also remain consistent with:

- `docs/boiler-flow-view-example-v1.html`
- `docs/boiler-abstraction-map-example-v1.html`

## Boiler Pilot Flow

The boiler should be the first full pilot for the module-first UI.

The user flow should be:

1. create mechanism `Boiler`
2. choose boiler pilot template
3. review seeded modules
4. bind real inputs/outputs/protocol resources
5. tune thresholds, PID, timers, trips
6. review operation view
7. review service view
8. open sequence logic only if needed

## Boiler Pilot Seeded Modules

The boiler template should seed at minimum:

- `Operator IO Module`
- `Fuel Temperature Measured Value Module`
- `Fuel Temperature PID Control Module`
- `Fuel Source / Valve Actuator Module`
- `Draft / Air Measured Value Module`
- `Fan Actuator Module`
- `Burner Actuator Module`
- `Flame Measured Value Module`
- `Boiler Water Level Measured Value Module`
- `Feed Pump On/Off Control Module`
- `Feed Pump Actuator Module`
- `Damper Actuator Module`
- `Water Chemistry Measured Value Module`
- `Boiler Alarm Policy Module`
- `Boiler Coordinator Sequence Module`

## Boiler Module Card Expectations

### Measured Value Module

Should show:

- current value
- units
- quality
- normal range
- active low/high alarms
- source/backend

### On/Off Control Module

Should show:

- current request state
- thresholds
- hysteresis summary
- min on/off timers
- blocked/fault state

### PID Control Module

Should show:

- PV / SP / MV
- active mode
- source of control authority
- in-range state
- fault/alarm state

### Actuator Module

Should show:

- command state
- feedback/position
- capability type
- moving/running/busy
- timeout/fault state

### Sequence Module

Should show:

- current state
- waiting reason
- pending transition
- fault reason
- major actions currently active

## Required Boiler-Specific UX Rules

### 1. Transport-Agnostic Binding

The user should bind a module input to:

- local digital input
- local analog input
- external resource
- protocol value
- module output

through one unified source chooser.

### 2. Capability-Agnostic Commanding

The user should bind a command target without caring first whether it is:

- relay
- analog setpoint
- motor open/close
- stepper
- protocol setpoint

The UI should first ask what function the mechanism needs, then let backend/capability refine the setup.

### 3. Authority And Fallback Must Be Visible

Any module that may run internal or external logic should clearly show:

- active authority
- standby authority
- takeover policy
- fault fallback state

### 4. Operation / Service / Logic Separation

The same mechanism should not force operators and engineers into the same screen.

The user should be able to move between:

- operation
- service
- logic

without changing the underlying object model.

## Advanced Path Rule

The module-first UI must always allow a deeper path into:

- channels
- signals
- blocks
- alarms
- sequences

This is required because:

- the product must remain more flexible than a narrow dedicated controller
- rare mechanisms will need deeper editing than templates can predict

## Editing And Regeneration Rule

After a module is created, the UI should support both:

- simple module-level editing
- advanced lower-layer inspection/editing

But it must preserve a clear distinction between:

- auto-generated objects still owned by the module
- user-overridden objects
- user-added advanced objects

When the module is edited later, the system should be able to:

- reapply safe defaults
- warn about user-edited generated objects
- preserve manual overrides where appropriate
- show exactly which lower-layer objects will change

## Display And Service Rule

The module-first UI should prepare future screen-building work.

When a module is created, it should already define:

- which outputs are normal module interface outputs
- which internal values are worth exposing to `Display`
- which internal values/statuses are worth exposing to `Service`

Examples:

- `pulse extractor`
  - `state`
  - `count`
  - `rate`
  - `fault`
- `actuator`
  - `running`
  - `busy`
  - `fault`
  - `feedback_ok`
- `sequence`
  - `current_state`
  - `waiting_reason`
  - `fault_reason`
  - `time_in_state`

## Non-Goals For V1

The first module-first UI should not yet try to be:

- a fully free canvas editor for arbitrary graphs
- a replacement for all low-level tabs
- a vendor-accurate mimic builder
- a full drag-and-drop HMI designer

## Delivery Order

The preferred delivery order after the current review work is:

1. stabilize UI semantics through the existing full UI review
2. define module registry and module-template registry
3. build boiler pilot module-first screens
4. connect module cards to existing low-level editors
5. only then move toward a richer visual mechanism editor
