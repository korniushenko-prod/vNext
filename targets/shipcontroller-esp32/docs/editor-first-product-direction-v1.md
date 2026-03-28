# Editor-First Product Direction v1

## Purpose

This document fixes the product correction after comparing the live project with the new reference mockup.

The important conclusion is:

- the runtime base is not the problem
- the main product entry is the problem

The project must move from:

- object-first configuration

toward:

- editor-first authoring

## Core Product Shape

The future product should feel like:

- `Project`
- `State / Flow Editor`
- `JSON Project Model`
- `Compiler`
- `Existing Runtime Engine`

Not like:

- `Channels`
- `Signals`
- `Blocks`
- `Modules`
- and only later maybe a scenario

## What Stays

The current runtime source of truth remains:

- `channels`
- `signals`
- `blocks`
- `sequences`
- `alarms`
- `display`

These should not be rolled back.

## What Changes

The main user-facing entry must change.

The user should start from:

- project
- main logic
- state machine when needed
- flow logic inside state or inside main flow

The low-level editors should move down to:

- advanced
- diagnostics
- compiler output
- service/debug

## Recommended Editor Model

### State Mode

Shows:

- states
- transitions
- current active state

### Flow Mode

Shows:

- block/module graph inside current state or main flow
- links
- explain/debug context

### Main Rule

State machine is a very important orchestration layer, but it should not be forced on every project.

So the practical product model should be:

- project always has `Main`
- `Main` may be:
  - simple flow logic
  - or a state-machine container
- additional state-machine states and subflows appear only when needed

## Relationship To Current Module Work

The current `Modules` work is not wasted.

But it should no longer be treated as the final main UX.

Instead:

- current module templates become building pieces for the future editor
- current module registry becomes a source for the editor library
- current generated runtime paths become the compiler/materialization backend

## Immediate Delivery Order

1. introduce a live `Editor` screen
2. validate three reference graphs:
   - `button -> timer -> relay`
   - `flowmeter`
   - `boiler`
3. define `JSON Project Model v2`
4. add `Editor -> JSON -> Compiler Preview`
5. only then reconnect deeper module/template work to the editor-first flow

## Non-Goals

For the first editor pass:

- not a full Node-RED clone
- not a freeform chaos canvas
- not a second runtime
- not replacing current low-level tools

## Product Statement

The controller should now be built as:

- one universal runtime firmware
- one editor-first project model
- one JSON representation
- one compiler into the existing engine

That is the new main product direction.
