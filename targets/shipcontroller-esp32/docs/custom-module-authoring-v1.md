# Custom Module Authoring v1

## Purpose

This document defines how a user should be able to create a reusable custom module.

The goal is:

- not to force users to repeat the same composition twice
- not to require code for every reusable idea
- not to invent a second hidden runtime

If a user assembles a useful composition and wants to reuse it again, that composition should be able to become a custom module.

## Core Rule

A custom module must compile down to the same platform model:

- `channels`
- `signals`
- `blocks`
- `sequences`
- `alarms`
- `modules`

It must not create:

- a third runtime
- a hidden vendor-specific execution model
- opaque magic that cannot be inspected

## Authoring Lifecycle

The required lifecycle is:

1. `Compose`
2. `Export Interface`
3. `Publish`
4. `Reuse`

## 1. Compose

The user assembles a working composition from standard building blocks:

- module templates
- sequences
- alarm policies
- primitive blocks if needed
- signals and channels

Examples:

- flowmeter package
- compressor lead/lag controller
- duty/standby pump group
- special valve supervision package
- BWTS wash sub-process

This composition may initially be single-use.

## 2. Export Interface

Before publishing, the user must define a clear module boundary.

Required exports:

- `inputs`
- `outputs`
- `params`
- `status`
- `fault / alarm`
- optional `service text`

The published module must not expose all internal helper objects by default.

### Inputs

Examples:

- `enable`
- `start`
- `stop`
- `pv_signal`
- `feedback`
- `mode`
- `reset`

### Outputs

Examples:

- `running`
- `ready`
- `fault`
- `alarm`
- `busy`
- `value`
- `total`
- `flow`

### Params

Examples:

- threshold
- hysteresis
- min on/off
- timeout
- K-factor
- PID coefficients

## 3. Publish

Publishing should create a new reusable custom template entry.

That entry should contain:

- `id`
- `label`
- `summary`
- `family`
- `exported inputs`
- `exported outputs`
- `editable params`
- `service/status facets`
- `help text`

Publishing should not discard the internal composition.

The system should still be able to:

- open the custom module
- inspect its internals
- validate its internals
- evolve it later

## 4. Reuse

After publishing, the custom module should behave like a first-class reusable module.

The user should be able to:

- instantiate it multiple times
- bind different channels/signals
- set different params
- see it in module library
- use it in composites and mechanisms

## Required Rules

### A. Standard Blocks Only

Any custom module must be built from standard reusable pieces.

That means:

- standard signals
- standard blocks
- standard sequences
- standard alarm policies
- standard module interfaces

No custom module should depend on one-off hidden code paths by default.

### B. Visible Interface

A custom module must always show:

- what goes in
- what comes out
- what parameters are user-editable
- what state it reports

### C. Open Internal View

There must be an advanced path:

- `Open internals`

So a service engineer can still inspect:

- internal module links
- sequence logic
- alarms
- helper blocks

### D. Version Safety

Custom modules should later gain:

- version
- migration notes
- compatibility rules

Not necessarily in v1, but the model should allow it.

## Product Position

Custom modules are the bridge between:

- one-off project composition
- reusable company/vessel logic packages

This is especially important for:

- flowmeter variants
- compressor control variants
- BWTS subsystem packages
- vessel-specific interlock packs

## Recommended V1 UX

### Step 1: Build

The user builds a working composition.

### Step 2: Click `Создать модуль`

The system opens a publish dialog.

### Step 3: Choose interface

The user selects:

- which inputs are public
- which outputs are public
- which params remain editable

### Step 4: Add help

The user fills:

- `Что делает`
- `Когда использовать`
- `Что нужно привязать`
- `Что выдаёт`
- `Типичные ошибки`

### Step 5: Save to library

The new module appears in the module/pattern library.

## Relationship To Mechanisms

Mechanisms should not be the only reusable unit.

There are two reusable levels:

1. `Custom Module`
2. `Composite Mechanism`

Examples:

- custom module:
  - flowmeter pulse conditioner
  - compressor alternation pack
  - valve supervision package

- composite mechanism:
  - boiler
  - pump station
  - BWTS train

## Immediate Direction

The next practical rule is now fixed:

- single-use composition is allowed
- reused composition should be able to become a custom module
