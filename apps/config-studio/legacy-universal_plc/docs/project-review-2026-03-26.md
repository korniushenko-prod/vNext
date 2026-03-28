# Project Review - 2026-03-26

## Purpose

This review captures the current state of `universal_plc` after the routing rewrite and compares it with the roadmap and canonical editor workflow.

It is meant to answer three questions:

1. what is already strong
2. what is still incomplete
3. what the team should do next without re-litigating the same UI and routing decisions

## Executive Summary

The project is in a good `config-first` state.

The editor already supports the most important assembly path for a real installation:

- create project
- create system objects
- define object ports
- create system signals/routes
- inspect and edit routes visually

The strongest current surface is:

- `System / Objects`
- `System / Signals & Routing`

The biggest recent improvement is the routing rewrite.
The new router is not perfect yet, but it is much more coherent than the previous penalty-heavy routing core.

## Comparison With Roadmap

### Roadmap Alignment

The current implementation matches the roadmap well in these areas:

- it is still clearly `config-first`
- the editor surface is being stabilized before runtime becomes authoritative
- core registries such as `objects`, `signals`, `links`, and `alarms` already have first-class editing surfaces
- the UI is schema- and contract-oriented rather than boiler-specific
- routing remains a system-level concept and is kept separate from component internal flow

### Where It Is Ahead Of The Earlier Docs

The current UI has already evolved beyond the older wording of `editor-workflow-v1.md` in one important way:

- `Signals & Routing` has become the main system wiring surface
- visual routing is now part of the normal editing loop, not just a derived mirror

This is a good change.
It should be treated as the new practical standard.

### Where It Is Still Behind The Roadmap

The platform is still not complete in these areas:

- hardware inventory and hardware binding are still behind objects and routing in maturity
- validation is still lighter than the future compiler/runtime will need
- simulation/runtime remains downstream rather than authoritative
- package-level authoring for boiler logic is still only partially realized

## Comparison With Editor Workflow

### What Already Works Well

The following sequence is now solid:

1. create or open project
2. assemble top-level objects
3. define object interfaces
4. wire objects through system signals
5. inspect routes visually

This is enough to assemble a believable top-level system graph.

### What Needs To Be Treated As The Updated Canonical Practice

The older workflow separated `Wire Objects Together` and `Define Signals And Alarms` more strongly.
In practice, the current product is better when system wiring is signal-first.

Updated practical rule:

- a top-level connection should usually be created as a named system signal
- source and targets should be edited through the signal route
- `Link Mirror` stays derived, not primary

### What Still Needs Work

The next workflow layers after wiring are still weaker:

- hardware binding
- full validation pass
- package-level component authoring for domain objects

## Strong Areas

### 1. Objects Surface

The object workflow is now strong because it supports:

- quick creation
- clear interface editing
- inline port management
- object inspector editing

### 2. Routing Surface

The routing workspace is strong because it supports:

- named system signals
- source and target binding
- visual route map
- per-signal coloring
- route inspector editing
- visual separation and route readability improvements

### 3. Inspector Model

The right inspector is now useful because selection actually matters:

- object selection edits object
- port selection edits port
- signal selection edits signal

That is the correct UI contract.

## Weak Areas

### 1. Hardware Layer

Hardware is not yet at the same maturity as objects and signals.
This is the main missing stage after system wiring.

### 2. Validation Layer

The editor catches some obvious issues, but not yet enough to serve as a proper pre-runtime gate.

### 3. Routing Maturity

The new routing base is much better, but still not finished.
The biggest remaining gaps are:

- better competing-signal separation near shared sink/source zones
- more mature corridor ownership
- stronger local crossing minimization
- clearer near-target branch choice in dense layouts

## Routing Lessons Learned

The key lesson is simple:

The old router failed because it accumulated too many local heuristics without one coherent routing model.

The rewrite works better because it is based on one cleaner idea:

- explicit port endpoints
- explicit lanes
- orthogonal graph routing
- route tree assembly
- restrained post-glossing

That architectural simplification mattered more than any single penalty tweak.

## Implementation Rules That Matter Most

These are the rules that turned out to be essential:

1. objects are real obstacles with clearance
2. ports must have fixed sides
3. routes must be orthogonal only
4. source/target objects must not be excluded wholesale from collision checks
5. a signal should be treated as a route tree, not a list of unrelated paths
6. outline and color rendering order matters for readability
7. render-time polish must never break endpoint correctness

## Rules That Matter Less Than We First Thought

These are useful, but secondary:

1. tiny bend penalties
2. over-optimizing Euclidean path length
3. aggressive glossing before route validity is stable
4. styling tweaks without fixing route geometry first

## Recommended Next Product Step

For the platform overall, the next major step is:

- bring `Hardware` and `Bindings` up to the maturity level of `Objects` and `Signals & Routing`

For routing specifically, the next major step is:

- improve competing-signal separation near shared target/source regions without disturbing the cleaner rewritten core

## Boiler Package - What Comes Next

For the current boiler-oriented workflow, the team has already completed:

- project shell
- top-level objects
- object interfaces
- system routes between objects

The next correct step is not more top-level routing.

The next step is:

1. choose one important top-level boiler object
2. open its internal authoring surface
3. define the first internal control logic slice
4. expose only the ports that are truly needed at system level

Recommended order for the boiler example:

1. `boiler_supervisor`
2. `steam_pressure_control`
3. permissive / trip groups
4. hardware bindings

That means the current project is ready to move from:

- top-level assembly

to:

- internal package/component authoring

## Practical Team Rule

Use the current routing rewrite as the stable base.
Do not return to the old routing core.
Any future routing work should refine the new model, not reintroduce layered ad-hoc penalties.
