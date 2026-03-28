# UI Architecture v1

## Purpose

This document defines the target architecture of the Web UI.

The goal is not only to improve the current screens, but to ensure future work on:

- `Display`
- `Alarms`
- `Sequences`
- `Application Templates`
- more block types

can be added without a major UI rewrite.

Related document:

- `docs/display-model-v1.md`
- `docs/pattern-first-ui-reorganization-v1.md`

The main principle is:

`simple on top, powerful underneath`

This means:

- ordinary users should think in scenarios and tasks
- advanced users should still be able to reach the low-level model
- the runtime engine stays stable
- the UI becomes a guided layer over the engine, not a second engine of its own

## Core Principles

### 1. Scenario First, Object Second

The user should first choose what they want to do:

- pulse an output from a button
- toggle a relay
- switch between two signal sources
- create a periodic action

Only after that should the UI expose:

- block type
- block mode
- helper objects
- advanced timing details

This is already starting in `Blocks` and should become the standard pattern.

### 2. Metadata-Driven UI

The UI should not keep growing through hardcoded `if type === ...` branches scattered across the page.

Instead, the UI should move toward registries that describe:

- available scenarios
- available block types
- available modes
- fields per mode
- help keys
- validation rules
- recommended defaults

This allows new block types and workflows to be added with less UI surgery.

### 3. One Domain Model

The Web UI must not invent parallel concepts for:

- display values
- alarm values
- sequence values

Everything should build on the existing platform model:

- resources
- channels
- signals
- blocks
- sequences

Display widgets, alarm rules and sequence steps should all reference the same signal/block IDs.

### 4. Reusable Interaction Patterns

The same UI patterns should repeat across tabs:

- searchable list
- filter
- detail editor
- inline summary
- help popover
- dependency review

This reduces learning cost and avoids building a different mini-app for each tab.

### 5. Progressive Disclosure

Each screen should have three depths:

- common task surface
- detailed editor
- advanced/internal view

The user should not be forced into the deepest level unless they actually need it.

This should align with the existing:

- `Operator`
- `Commissioning`
- `Advanced`

UI modes.

## UI Layers

### Layer 1: Navigation and Context

Responsibility:

- top tabs
- current UI mode
- language
- current controller identity
- quick health state

Objects:

- active tab
- active UI mode
- active language
- active board/controller context

This layer should stay small and stable.

Navigation clarification:

- the current flat top-tab model should evolve toward grouped navigation:
  - `Обзор`
  - `Аппаратная часть`
  - `Автоматика`
  - `Сервис`

### Layer 2: Workflow Layer

Responsibility:

- guided setup
- scenario selection
- user-facing actions

Examples:

- `Add timer` becomes `Choose scenario`
- `GPIO Assistant` becomes `Choose button`
- future `Display` becomes `Choose widget`

This is the layer most users should live in.

### Layer 3: Editor Layer

Responsibility:

- configure one object in detail
- show only relevant fields
- validate before save

Examples:

- signal editor
- block editor
- future display widget editor
- future alarm editor

### Layer 4: Reference and Cleanup Layer

Responsibility:

- ownership visibility
- auto-generated helpers
- where-used view
- delete review

This layer already exists in first form through `Smart Cleanup Review`.

It should later become shared infrastructure for:

- blocks
- signals
- display widgets
- alarms
- sequences

### Layer 5: Advanced/Internal Layer

Responsibility:

- raw type/mode details
- template internals
- diagnostics
- future low-level debug tools

This layer should remain available, but not dominate the normal commissioning flow.

## Required Registries

To avoid future UI sprawl, the following registries should exist.

### 1. Scenario Registry

Describes user-facing scenarios such as:

- `pulse_button`
- `periodic_pulse`
- `enabled_periodic`
- `toggle_button`
- `set_reset_buttons`
- `source_switch`

Each scenario should define:

- label
- summary
- target block type
- target mode
- relevant fields
- suggested defaults
- help keys

### 2. Block UI Registry

Describes each block type and mode:

- `timer`
- `button`
- `latch`
- `selector`

For each mode, it should define:

- visible fields
- field groups
- validation rules
- preview strategy
- advanced-only fields

### 3. Field Registry

Defines reusable field metadata:

- field id
- label key
- help key
- value type
- source list type
- validation rule

This avoids repeating field rules across screens.

### 4. Dependency Registry

Defines object relationships:

- block uses signal
- signal uses signal
- widget uses signal
- alarm uses signal
- sequence uses block or signal

This is required for:

- smart cleanup
- future `where used`
- future detach/remove review

### 5. Formatting Registry

Needed for future display and service UX:

- units
- precision
- boolean formatting
- duration formatting
- engineering formatting

This avoids hardcoding display logic in many different places.

### 6. Display Registry

Needed for future local HMI and small-screen workflows:

- screen definitions
- widget types
- widget field groups
- signal binding rules
- formatting compatibility
- preview behavior

This should let the display editor grow without becoming a separate UI system.

## Target UI Structure by Area

### Overview

Role:

- system status
- problem center
- entry point

Should show:

- controller identity
- board/template chain
- health
- key I/O counts
- active problems
- warnings
- auto-generated helper count

Should later also show:

- orphaned helpers
- invalid block references
- display/alarm/sequence warnings

### Hardware

Role:

- physical capability and reservations

Should remain engineering-focused, but:

- avoid mixing with everyday logic building
- stay cleanly separate from `Blocks` and `Signals`

### Signals

Role:

- signal layer editor and monitor

Should evolve toward:

- `User Signals`
- `System Signals`
- `Auto-generated Signals`

Future additions:

- where-used
- ownership
- quality-centric filtering

### Blocks

Role:

- main logic workflow screen

This is currently the most important UX surface.

Target structure:

- quick scenarios
- block list
- block editor
- helper preview
- dependency-aware delete

Future additions:

- block categories
- live runtime status per block
- recommended templates per use case

### Templates

Role:

- engineering library management

This should stay available in `Advanced`, but not leak into normal commissioning more than needed.

### Display

Role:

- local HMI and small-screen presentation over existing signals

Must be:

- signal-driven
- widget-based
- formatting-aware
- dependency-aware

Must not:

- invent display-only process values
- become a second logic engine
- diverge from the common `signals + blocks + sequences` model

Role:

- configure local screens from existing signals

This should be built as:

- screen list
- widget list
- signal binding
- formatting
- visibility conditions

Not as a separate data model.

### Alarms

Role:

- configure alarm rules from signals and block outputs

Same editor pattern should be reused:

- list
- filter
- modal editor
- references

### Sequences

Role:

- state-machine workflow

Should follow the same philosophy:

- scenario-first where possible
- advanced state details only when needed

## File-Level Refactor Direction

The current `src/web/web.cpp` is too monolithic.

The next steps should not be a risky full rewrite.

Instead, the UI should move gradually toward separable areas:

- `web_routes.cpp`
- `web_data_builders.cpp`
- `web_ui_shell.cpp`
- `web_ui_help.cpp`
- `web_ui_blocks.cpp`
- `web_ui_signals.cpp`
- later:
  - `web_ui_display.cpp`
  - `web_ui_alarms.cpp`
  - `web_ui_sequences.cpp`

Even if these remain compiled into one HTML page, their source ownership should be separated.

## Safe Migration Path

### Phase 1

- keep existing UI working
- move more UI decisions into registries
- reduce repeated `if/else` UI logic

### Phase 2

- reuse the same patterns across `Blocks`, `Signals`, `Display`
- strengthen dependency graph support

### Phase 3

- split `web.cpp` into logical modules
- keep public endpoints and payloads stable

### Phase 4

- add `Display`, `Alarms`, `Sequences` on top of the same UI architecture

## What To Avoid

- separate UI-only object models
- new tabs with one-off UX patterns
- hidden helper logic that cannot be inspected
- future display/alarm editors that bypass the signal model
- uncontrolled growth of hardcoded help/field logic in one file

## Recommended Next Steps

1. Move `Blocks` further toward grouped sections:
   - control source
   - output
   - timing
   - advanced

2. Introduce a small internal scenario registry instead of scattered scenario mapping logic.

3. Introduce a shared dependency/reference API layer for future `Display` and `Alarms`.

4. Use the same editor pattern when `Display Model v1` begins.

## Final Rule

Any new UI feature should answer these questions before implementation:

1. Does it use the common model (`signals`, `blocks`, `sequences`)?
2. Can it reuse an existing editor/list/help pattern?
3. Does it fit `Operator / Commissioning / Advanced`?
4. Will its dependencies be visible and reviewable later?

If the answer is "no", the feature should be redesigned before being added.
