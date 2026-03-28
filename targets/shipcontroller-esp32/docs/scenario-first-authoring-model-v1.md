# Scenario-First Authoring Model v1

## Purpose

This document defines the product-level authoring model the project should move toward.

It exists to answer one core product requirement:

- a simple user should be able to build a simple project from understandable resources
- an advanced user should be able to build a complex project
- both should do this on the same firmware
- complexity should grow by configuration and composition, not by reflashing a different logic engine

## Core Product Contract

The controller should behave like:

- one universal runtime firmware
- many project shapes above it
- multiple authoring levels

Not:

- one firmware per mechanism
- one firmware for simple tasks
- another firmware for advanced tasks

The real product is:

- `Single Runtime Firmware`
- `Scenario-First Authoring`
- `Module-Based Composition`
- `Advanced Internals Without Reflash`

## Main Idea

The user should not start from:

- raw blocks
- internal signal names
- runtime-only primitives

The user should start from:

- a project
- a root scenario
- understandable modules
- explicit resources

The system should then materialize:

- channels
- signals
- blocks
- owned sequences
- alarms

under the hood.

## Authoring Hierarchy

The preferred future hierarchy is:

- `Project`
  - always contains root `Main`
- `Scenario`
  - user-visible logic container
- `Modules`
  - user-facing building pieces
- `Child Sequences`
  - used where phase/state behavior is needed
- `Generated Internals`
  - real signals / blocks / owned sequences / alarms

Visible authoring should mainly happen at:

- `Main`
- other scenarios
- modules
- visible child sequences

Advanced users may still open:

- generated blocks
- generated signals
- generated owned helpers

## Root Scenario Rule

Every project should always start with one root scenario:

- `Main`

`Main` is not only a convenience placeholder.

It is the stable root orchestration container of the project.

It should:

- always exist
- be the first place where the user adds modules
- allow simple projects to stay simple
- allow later extraction into child sequences without rebuilding from zero

This matters because a user may:

1. start with a very small project
2. add several modules directly into `Main`
3. later realize that part of this logic has phases
4. extract that part into:
   - `Purge`
   - `Burning`
   - `Cooldown`
   - `Auto Start`
   - any other child sequence

The model must support this evolution without forcing a restart of the project structure.

## Scenario Rule

A scenario is a user-facing logic container.

A scenario may contain:

- primitive modules
- functional modules
- child sequences
- top-level conditions and links

Not every scenario must be a state machine.

Two valid scenario shapes exist:

### 1. Function-style scenario

Examples:

- cyclic output
- start/stop relay
- RPM extraction
- simple threshold control

These may be built entirely from modules whose internals are block-based.

### 2. Phase-style scenario

Examples:

- purge
- burning
- ignition
- cooldown
- wash cycle

These should use a real sequence/state-machine.

## Sequence Rule

Sequences are first-class runtime units.

A sequence should publish runtime-visible signals/statuses such as:

- `enabled`
- `active`
- `running`
- `waiting`
- `done`
- `fault`
- `current_state`
- `status_text`

This is important because:

- other scenarios can depend on sequence state
- displays can show sequence state directly
- service screens can explain why a process is active or waiting

The important conceptual correction is:

- a project should not be modeled as only peer sequences
- instead:
  - `Main` is the root scenario/container
  - child sequences are attached where real phase behavior is needed

## Module Rule

Modules should become the main user building blocks.

But modules should not be giant domain-specific black boxes.

They should be small enough to compose, but meaningful enough to hide raw primitive plumbing.

### Recommended module sizes

#### 1. Primitive modules

Close to user-visible building bricks:

- input / button
- timer
- relay / discrete output
- threshold
- logic
- latch
- selector
- counter

#### 2. Functional modules

Slightly smarter task-oriented pieces:

- cyclic output
- manual override
- signal extractor
- RPM / Flow
- start/stop memory
- mode / authority

#### 3. Composite / Custom modules

Reusable user-owned assemblies:

- one user composition used more than once
- published back into the library

This means the system should feel closer to:

- small composable nodes

than to:

- giant mechanism templates

while still keeping the industrial runtime model underneath.

## Relationship To Blocks

Blocks remain important, but they should not stay the main entry point for ordinary authoring.

Blocks are:

- primitive runtime units
- advanced editing tools
- the engine’s internal logic vocabulary

Modules are:

- the user-facing building layer

Scenarios are:

- the user-facing project structure layer

## Materialization Rule

Scenario and module authoring must materialize into real lower-layer objects.

That materialization step should:

1. bind existing channels/signals when possible
2. create missing normalized signals when needed
3. create owned blocks
4. create owned child sequences when needed
5. create owned alarms when needed
6. publish stable outputs for:
   - scenario
   - module
   - sequence

This keeps the system:

- inspectable
- debuggable
- reusable
- runtime-safe

## Runtime Rule

Even with scenario-first authoring, runtime must stay flat.

Execution should still be:

- source signals once
- blocks once
- sequences once
- alarms once
- outputs once

Modules and scenarios do not become nested schedulers.

They remain:

- authoring
- grouping
- ownership
- traceability
- service/display exposure

## Simple User Path

The simple user path should be:

1. install firmware
2. choose board type
3. open project
4. see ready `Main`
5. add a few modules
6. bind resources
7. run

This should already be enough for:

- relay logic
- cyclic outputs
- start/stop
- simple counters
- threshold automation
- simple flow/RPM tasks

## Advanced User Path

The advanced user path should be:

1. start in the same `Main`
2. add more modules
3. extract logic into child sequences
4. open generated internals when needed
5. publish repeated patterns as custom modules

This should allow:

- complex automation
- multiple sequences
- interlocks
- custom diagnostics
- service-oriented displays
- boiler / flowmeter / compressor / BWTS-class projects

without changing firmware shape.

## Why This Is Better Than Block-First Authoring

Block-first authoring is still valuable for advanced users.

But as the primary entry point, it has several problems:

- too much low-level thinking too early
- poor discoverability for simple projects
- poor growth path from “small task” to “real mechanism”
- too much accidental complexity

Scenario-first authoring solves this by keeping:

- project intent visible
- complexity incremental
- runtime internals explicit but secondary

## Product Consequence

The future UI should increasingly feel like:

- project explorer
- root `Main`
- scenarios
- modules
- service/debug exposure

and less like:

- direct editing of a low-level block table as the first step

## Immediate Conceptual Consequence

The next large product/UI direction should not be:

- another raw block-centric pass

It should be:

- `Project -> Main -> Modules -> Child Sequences -> Generated Internals`

with:

- a visible project structure
- a stable root scenario
- smaller composable modules
- explicit generated internals preview

## Summary

The concept should now be read as:

- one runtime firmware
- one root scenario per project
- user-facing scenarios and modules as the primary authoring layer
- blocks/signals/sequences as explicit compiled internals
- simple projects stay simple
- complex projects grow from the same starting point

