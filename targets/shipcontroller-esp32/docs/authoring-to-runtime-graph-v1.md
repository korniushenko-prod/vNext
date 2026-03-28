# Authoring To Runtime Graph v1

## Purpose

This document fixes one important architectural distinction:

- authoring structure is multi-level for humans
- runtime execution must stay flat for the controller

It exists to prevent the wrong implementation shape:

- `flow line -> module -> block -> signal` as nested runtime execution

That shape would cause:

- repeated work
- confusing ownership
- hidden update order
- poor debuggability

## Core Rule

The abstraction ladder is for:

- authoring
- grouping
- ownership
- setup
- reuse
- display/service exposure

It is not a mandate for nested execution.

## Authoring Graph

The authoring graph is how the user thinks about a mechanism.

Typical chain:

- `mechanism`
  - `flow lines`
    - `modules`
    - `visible sequences`

Modules then own:

- generated `blocks`
- generated or bound `signals`
- optional owned `sequence`
- optional owned alarms

This graph exists for:

- user understanding
- configuration
- traceability
- reuse
- publishing stable module interfaces

## Compiled Runtime Graph

The controller should execute a flat compiled graph.

The real runtime units are:

- `signals`
- `blocks`
- `sequences`
- `alarms`
- output publishing

Modules do not form a second runtime layer.

Modules do not recursively update their children.

Modules only:

- define ownership
- define setup intent
- expose interfaces
- map selected generated values/statuses into service/display

## Practical Meaning

Wrong:

```text
updateFlowLine()
  -> updateModule()
    -> updateBlock()
      -> updateSignal()
```

Right:

```text
read resources/comms once
update normalized signals once
update all blocks once
update all sequences once
update alarms once
publish outputs once
refresh service/display once
```

## Relationship Between Layers

### Signals

Signals are the shared data plane.

Signals:

- carry values
- carry bool states
- carry quality
- carry status text

### Blocks

Blocks are primitive execution units.

Blocks:

- read signals
- hold local runtime state if needed
- publish signals

### Sequences

Sequences are stateful execution units.

Sequences:

- read signals
- keep state/timers
- publish status and action outputs

### Modules

Modules are authoring and ownership units.

Modules:

- own generated objects
- publish a stable interface
- are visible in module-first UX
- do not create a recursive runtime update tree

## Compile / Materialize Step

There must be an explicit compile/materialize step from authoring to runtime.

This step should:

1. bind existing channels/signals when possible
2. create missing normalized signals when needed
3. create owned blocks
4. create owned sequences when needed
5. create owned alarms when needed
6. register ownership metadata
7. publish module interface outputs
8. expose selected generated values for display/service

## Example

Visible authoring object:

- `Module: Cyclic Purge`

User-facing inputs:

- `compressor_running`
- `manual_purge`

User-facing params:

- `on_time`
- `off_time`

Published output:

- `purge_valve_cmd`

Compiled runtime graph:

- signal `compressor_running`
- signal `manual_purge`
- block `purge_interval`
- block `purge_or`
- output signal or channel command `purge_valve_cmd`

The module owns these runtime objects.

The module does not execute them recursively.

## Design Consequence

This architecture allows:

- simple UX on top
- traceable lower-layer objects
- one-pass scheduler execution
- later optimizations such as:
  - sleeping/inactive runtime units
  - dependency-aware ordering
  - dirty propagation

without breaking the authoring model.
