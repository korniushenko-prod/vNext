# Visual Editor Strategy v1

## Purpose

This document fixes the intended direction for a future visual editor.

The goal is not to bolt a generic canvas onto the controller.

The goal is to create a visual authoring layer that:

- is simple enough for an ordinary commissioning user
- is strong enough for complex mechanisms
- stays aligned with the existing engine
- does not create a second hidden logic system

## Product Target

The visual editor should keep the product in its intended space:

- easier than a PLC project for medium-complexity mechanisms
- more structured than ESPHome-style YAML/device automation
- more open than narrow dedicated controllers
- still understandable by a normal service engineer

That means the editor must feel like:

- `configure a mechanism`

not:

- `draw arbitrary boxes and hope the engine matches them`

## Architectural Rule

The runtime source of truth must remain:

- `resources`
- `channels`
- `signals`
- `blocks`
- `sequences`

The visual editor is only a guided authoring surface over that model.

The next user-facing abstraction above that model is now also fixed in:

- `docs/functional-module-model-v1.md`
- `docs/module-runtime-contract-v1.md`
- `docs/sequence-contract-v1.md`

It must not invent:

- a second config format
- a parallel hidden graph runtime
- implicit hardware channels
- separate display/alarm/sequence logic worlds

It should increasingly present:

- functional modules
- module templates
- composites

while still allowing advanced users to drop into:

- channels
- signals
- blocks
- sequences

## What Fits The Current Engine Well

These parts can be added with relatively little architectural stress.

### 1. Sequence State Editor

Best visual match to the current engine:

- states as nodes
- transitions as connectors
- side panel for:
  - timers
  - conditions
  - actions
  - fault behavior
  - waiting/fault reasons

Why it fits:

- `sequence` is already a first-class runtime layer
- sequence already owns dependent signals
- alarms/display already understand sequence state/status

### 2. Mechanism Template Wizard

This fits well if templates generate normal:

- sequences
- helper blocks
- signals

Examples:

- valve open / wait feedback / opened / fault
- pump start / wait feedback / run / trip
- purge / dwell / cooldown

Why it fits:

- it stays task-first
- the generated result still lands in the current engine model

### 3. Readable Dependency / Flow Map

A read-only or lightly interactive map fits well:

- source signal
- helper blocks
- interlocks
- sequence
- alarm
- display usage

Why it fits:

- this is mostly a better view over the existing dependency graph
- it helps service and commissioning without changing runtime semantics

The first product-shaped reference for that direction is now illustrated in:

- `docs/boiler-flow-view-example-v1.html`

That example fixes several important UX rules:

- the user should see which lane is currently active
- inactive but still relevant modules should stay visible but dimmed
- warning-only paths must be visually different from trip/stop paths
- sequence-state-dependent supervision should stay readable in one flow
- links should support explicit insertion points for additional modules between existing nodes

## What Fits With Small Engine Extensions

These are good targets, but only after a small stabilization pass.

### 1. Better Sequence Action Model

Needed for a strong visual sequence editor:

- explicit action kind:
  - write channel
  - publish signal
  - command target
- explicit behavior on:
  - enter
  - exit
  - done
  - fault
  - reset

Without this, the visual editor will feel fuzzy and inconsistent.

### 2. Structured Transition Conditions

Needed for practical visual transitions:

- signal condition
- edge
- delay
- timeout
- permissive summary

Current engine can do much of this already, but a visual editor will want a more explicit condition structure.

### 3. Stable Text / Enum State Sources

Needed for user-friendly visual authoring:

- current step label
- waiting reason
- fault reason
- mode text

This is already moving in the right direction through `system.*` sources and sequence/alarm summaries.

## What Would Require Bigger Redesign

These are possible in theory, but are not the right first visual editor for this platform.

### 1. Full Freeform Block Canvas

Example:

- dragging timers, comparators, selectors and wires around like a generic node editor

Why this is risky now:

- the current engine is not a graph-engine-first product
- the UX would become too engineering-heavy
- it would push users into low-level internals too early
- it risks becoming a Node-RED clone on top of a different runtime

### 2. Ladder Logic As Main Authoring Model

Why it is a bad fit:

- our engine is signal/sequence-oriented, not scan-rung-oriented
- ladder would either be fake or require a second execution model
- it would make the UI heavier without matching the underlying runtime

### 3. Visual Display Layout As Absolute Canvas First

Why this should not be first:

- the display model is intentionally a view over signals
- a heavy drag-and-drop canvas too early would encourage display-as-logic mistakes

## Recommended Visual Editor Model

The recommended direction is a layered editor.

That layered editor should increasingly be module-first in the user-facing surface, while still compiling down to the current engine.

### Layer 1: Mechanism Wizard

Purpose:

- start from user intent
- start from module templates instead of raw object lists

Examples:

- pump with feedback
- valve with open/close feedback
- purge cycle

Output:

- normal sequence
- normal helper blocks if needed
- normal signals
- later normal functional-module instances over that engine

### Layer 2: Sequence Visual Editor

Purpose:

- edit the actual mechanism flow visually

Main surface:

- state nodes
- transition arrows
- current-state highlighting
- fault path visibility

Side panel:

- state settings
- actions
- transition conditions
- timers
- permissives

This should become the main visual editor.

### Layer 3: Dependency / Signal Map

Purpose:

- understand how the mechanism is wired into the rest of the controller

Show:

- inputs used by sequence
- helper outputs
- alarm bindings
- display bindings
- external resource links

This is primarily a service/inspection tool.

### Layer 4: Advanced Block Editor

Purpose:

- keep full power for complex or unusual algorithms

This remains available, but should not become the default daily surface for normal users.

## Recommended First Delivery Order

### Phase A: Full UI Review

Do this first.

Reason:

- current UI semantics must be stabilized before polishing a visual layer

### Phase B: Sequence Authoring Stabilization

Before visual sequence editing, ensure:

- action semantics are explicit
- waiting/fault reasons are stable
- state/transition summary is consistent

### Phase C: First Visual Editor

Start with:

- `Sequence Visual Editor v1`

Not with:

- full freeform block canvas

### Phase D: Mechanism Template Wizard

Once the sequence visual editor is trustworthy:

- add domain templates on top

### Phase E: Dependency Map

After real mechanism editing exists:

- add read-only or lightly interactive dependency view

## Hard Rules

1. Visual editing must save back into the existing engine model.
2. A visual mechanism must remain editable from normal lists/forms too.
3. No hidden hardware channels should be auto-created.
4. Sequence-owned dependent signals are acceptable and preferred.
5. Helper blocks may be generated by templates only when they remain visible and traceable.
6. The first visual editor should center on `sequence`, not on arbitrary block graph drawing.

## Final Direction

The best visual editor for this platform is:

- not a generic canvas for everything
- not a ladder clone
- not a second runtime

It is:

- a task-first mechanism builder
- a sequence/state visual editor as the main canvas
- plus dependency and advanced views around it

This keeps the product aligned with:

- simple on top
- powerful underneath
- one runtime model
- no parallel logic system
