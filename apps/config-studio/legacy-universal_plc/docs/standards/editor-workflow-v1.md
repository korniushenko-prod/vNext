# Editor Workflow v1

## Purpose

This document defines how a user should assemble a `universal_plc` project from zero.

It is not only a UI note.

It is the interaction contract between:

- project schema
- editor screens
- compiler expectations
- runtime expectations

If the editor workflow is wrong, the schema will drift and the runtime will later be forced to support accidental UI decisions.

## Core Principle

A project is not assembled in one giant canvas.

It is assembled in layers:

1. project setup
2. system composition
3. component authoring
4. system wiring
5. hardware binding
6. validation
7. simulation / runtime

Each layer edits a different kind of relationship.

## Three Different Kinds Of Connections

These must remain separate in both schema and UI.

### 1. Component Internal Connections

These live inside one object.

They are `Flow Edges`.

Format:

- `from_node`
- `from_port`
- `to_node`
- `to_port`

These are edited only in the component flow editor.

### 2. System-Level Connections

These connect objects to each other.

They are `System Links`.

Format:

- `source.object_id`
- `source.port`
- `target.object_id`
- `target.port`

These are edited only in the system wiring surface.

### 3. Hardware Connections

These connect logical model elements to physical I/O.

They are `Bindings`.

Format:

- logical signal or command
- hardware module
- hardware channel

These are edited only in the hardware binding surface.

## Canonical User Flow

### Step 1. Create Project

User creates the project container.

Defines:

- project id
- name
- description
- tick
- timezone
- default view

Output:

- valid root `project` object

### Step 2. Define Hardware Inventory

User defines available hardware modules before making bindings.

Defines:

- CPU modules
- DI / DO modules
- AI / AO modules
- communication modules
- channel inventory

Output:

- `project.hardware.modules`

### Step 3. Assemble System Objects

User builds the logical system from reusable components.

Creates:

- native controllers
- groups
- alarms
- package objects

Examples:

- `PermissiveGroup`
- `TripGroup`
- `PumpPairController`
- `SequenceController`
- `AlarmObject`

Output:

- `project.system.objects`

### Step 4. Define Object Interfaces

Each object must have an explicit interface before internal logic or external wiring.

Defines:

- input ports
- output ports
- types
- signal semantics
- required / optional behavior

Output:

- `object.interface.inputs`
- `object.interface.outputs`

### Step 5. Author Internal Component Logic

Now the user opens one object in `Component Editor`.

This is where internal behavior is built.

Submodes:

- `Interface`
- `Flow`
- `State`
- `JSON`

Rules:

- `Flow` edits only internal nodes and edges
- `State` edits only internal states and transitions
- object header edits only object-level metadata

Output:

- `object.internal_model.flow`
- `object.internal_model.state_machine`

### Step 6. Wire Objects Together

Once objects expose interfaces, the user builds the system graph.

The user connects:

- object outputs
- to object inputs

Rules:

- only object ports may be connected
- system wiring must not edit internal component flow
- broken references must be visible immediately

Output:

- `project.system.links`

### Step 7. Define Signals And Alarms

User creates global registries that should exist at the system level.

Defines:

- global signals
- derived signals
- alarm objects
- alarm effects

Output:

- `project.system.signals`
- `project.system.alarms`
- `project.system.alarm_matrix`

### Step 8. Bind To Hardware

Only now does the user connect the logical system to real I/O.

Connects:

- command outputs to DO / AO
- feedback inputs to DI / AI
- derived signals to channels where needed

Rules:

- bindings must reference existing modules and channels
- bindings must not change logical topology

Output:

- `object.bindings`
- or project-level binding registry if later centralized

### Step 9. Validate

The editor must validate before interpreter/runtime become authoritative.

Validation must catch:

- duplicate ids
- missing required ports
- edges pointing to missing nodes
- links pointing to missing objects
- bindings pointing to missing modules/channels
- incompatible port types
- unconnected required inputs

### Step 10. Simulate / Run

Only after a valid model exists should simulation or runtime execution become primary.

At this point:

- compiler resolves references
- runtime consumes normalized tables
- explain/debug works against stable model ids

## Required Editor Surfaces

The product should not be one generic screen.

It needs these explicit surfaces.

### 1. Project Setup

Purpose:

- configure project container and defaults

Edits:

- project metadata
- project settings
- base views

### 2. System Builder

Purpose:

- add and organize objects in the logical system

Edits:

- object registry
- object identity
- object selection

### 3. Component Editor

Purpose:

- edit one object as a reusable component

Edits:

- object interface
- internal flow
- internal state machine
- internal JSON

### 4. System Wiring

Purpose:

- connect objects together

Edits:

- `project.system.links`

### 5. Hardware Binding

Purpose:

- connect logical model to real I/O

Edits:

- hardware bindings
- channel mappings

### 6. Validation Surface

Purpose:

- show errors, warnings and missing connections

Edits:

- none

### 7. Simulation / Trace

Purpose:

- inspect behavior after model is structurally valid

Edits:

- runtime-only controls

## Component Editor Contract

The component editor itself is not one fixed layout.

Each submode needs its own geometry.

### Interface Mode

Layout:

- left optional port tools
- center large interface lane
- right local inspector

Main task:

- define object boundary

### Flow Mode

Layout:

- left node palette
- center large graph canvas
- right local inspector

Main task:

- create nodes
- place nodes
- connect output ports to input ports

### State Mode

Layout:

- center state graph
- right transition/state inspector

Main task:

- create states
- create transitions
- define guards and actions

### JSON Mode

Layout:

- single wide editor

Main task:

- inspect canonical structure
- support advanced edits only

## Flow Editor Contract

The flow editor must be port-based.

Not card-based.

### A Flow Node Must Have

- `id`
- `type`
- `x`
- `y`
- `ports.inputs[]`
- `ports.outputs[]`

### A Flow Edge Must Have

- `id`
- `from_node`
- `from_port`
- `to_node`
- `to_port`

### Flow Interaction Rules

- node headers drag
- node body does not create connections
- output ports start a connection
- input ports complete a connection
- connection is stored immediately
- node position is stored immediately
- edges are selectable entities

## System Wiring Contract

System wiring must feel different from internal flow editing.

User is not editing node graphs.

User is editing the plant topology.

### A System Link Must Have

- `id`
- `source.object_id`
- `source.port`
- `target.object_id`
- `target.port`
- `kind`
- `semantic`

### System Wiring Interaction Rules

- show only object ports
- group objects visually
- show compatible targets
- reject invalid type pairs
- keep system links visible independently from internal object flow

## What The Editor Must Never Do

- it must not hide whether a connection is internal, system-level or hardware-level
- it must not auto-invent topology without showing it explicitly
- it must not force the same layout on interface, flow and state editing
- it must not make boiler-specific assumptions part of generic editor structure

## Immediate UI Consequence

The next UI refactors should follow this structure:

1. stabilize `System Builder`
2. stabilize `Component Editor` with mode-specific layouts
3. add separate `System Wiring`
4. add separate `Hardware Binding`
5. add validation surface before deeper runtime work

## Status

This document is the working editor architecture for `v1`.

UI changes should now be judged against this workflow, not only against local layout convenience.
