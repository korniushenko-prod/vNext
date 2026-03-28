# Module Runtime Contract v1

## Purpose

This document fixes one shared non-blocking runtime contract for the real execution layer under future functional modules.

It exists to prevent accidental growth into:

- blocking logic
- hidden mini-runtimes
- template-specific exceptions
- hard-to-debug execution behavior

Important clarification:

- `modules` are primarily authoring/ownership/interface objects
- the real runtime units remain:
  - `signals`
  - `blocks/helpers`
  - `sequences`
  - `alarms`

## Core Rule

A module is not an operating-system process.

A module is also not a second recursive runtime layer.

The non-blocking runtime contract applies to:

- primitive runtime blocks
- sequences
- future directly executable runtime units

Modules sit above that layer and must compile down into it.

This means the platform should use:

- many small stateful runtime objects

and should not use:

- blocking waits
- `while` loops waiting for feedback
- `delay(...)`-style control logic
- one runtime unit monopolizing the control loop
- nested `module -> block -> signal` execution trees

## Runtime Contract

Every real runtime unit must fit this shape conceptually:

1. `inputs`
2. `params`
3. `state`
4. `timers`
5. `outputs`
6. `status`
7. `validation`

### Inputs

Inputs are read-only from the point of view of one runtime update step.

Inputs may come from:

- `signal:*`
- `channel:*`
- `module:*`
- future protocol-backed bindings

The module runtime must not assume that the original source is:

- local GPIO
- analog hardware
- Modbus
- satellite transport

It should only consume normalized inputs.

### Params

Params are static or slowly changing configuration values such as:

- thresholds
- hysteresis
- PID gains
- timeouts
- policy flags

### State

Each runtime unit may keep internal runtime state such as:

- current mode
- current phase
- last command
- latched fault state
- previous sampled input

### Timers

Timers must be implemented as elapsed-time comparisons using a shared time base such as `millis()`.

Allowed pattern:

```text
if (now - state_enter_ms >= timeout_ms) {
  ...
}
```

Disallowed pattern:

```text
while (!feedback) {
  ...
}
```

### Outputs

Outputs should be stable named interface points such as:

- `value`
- `ready`
- `running`
- `fault`
- `alarm`
- `busy`
- `position`
- `trip`

These outputs are the contract used by:

- other modules
- sequences
- alarms
- display/service UI

### Status

Status is user-facing and service-facing runtime meaning, for example:

- `idle`
- `running`
- `waiting`
- `fault`
- `stale`
- `manual`
- `shadow`

### Validation

Validation is authoring-time or configuration-time health, for example:

- missing required bindings
- invalid references
- unsupported backend/capability combination
- conflicting authority mode

Validation is not runtime state.

It should be visible in module-first authoring and service views.

## Mandatory Behavioral Rules

### Rule A: Non-Blocking

A module update must finish quickly in one control-loop pass.

### Rule B: Re-entrant Per Tick

It must be safe to call the module update on every loop iteration.

### Rule C: Time-Driven, Not Delay-Driven

Waiting must be represented by state plus elapsed time, not blocking waits.

### Rule D: Explicit Interface

A module must expose stable named outputs and statuses instead of hidden implicit side effects.

### Rule E: Transport-Agnostic Inputs

Module logic must depend on normalized inputs, not vendor-specific transport details.

### Rule F: Capability-Based Outputs

Commanding should target a capability, not a vendor-specific object shape.

Examples:

- `discrete_onoff`
- `reversible_open_close`
- `analog_setpoint`
- `stepper_position`
- `protocol_setpoint`

### Rule G: Clear Ownership

When authority matters, the runtime-visible interface must make it visible.

Examples:

- `internal_primary`
- `external_primary`
- `shadow`
- `fallback_takeover`

## Recommended Update Order Inside Main Loop

The current platform should continue moving toward this order:

1. acquire inputs and external data
2. normalize channel/resource state into signals
3. update low-level blocks/helpers and conditioning
4. update sequences
5. update alarm policy
6. publish outputs
7. refresh service/display state

Modules should not introduce another recursive update phase in between.

## Relationship To Modules

Future module families must be compatible with this contract by compiling into this runtime layer.

That means:

- a module may own blocks
- a module may own one or more sequences
- a module may expose stable outputs/statuses
- but the scheduler still updates the owned runtime objects directly

Reference:

- `docs/authoring-to-runtime-graph-v1.md`

## Immediate Next Steps

This contract should immediately drive:

1. validation/status layer for modules and links
2. flow view v1
3. explicit module materialization/setup wizard
4. sequence-first visual authoring on top of stable module semantics
