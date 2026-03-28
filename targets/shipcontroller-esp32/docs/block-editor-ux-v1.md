# Block Editor UX v1

## Purpose

This document captures the agreed UX rules for the block editor.

It exists so the project can keep improving the Web UI without losing the
principle:

`simple on top, powerful underneath`

## Goals

- make common commissioning tasks obvious
- hide internal IDs and engine details from ordinary users
- keep full runtime compatibility with existing block/signal architecture
- leave a clean path for future `Display`, `Alarms`, and `Sequences`

## Agreed UX Rules

### 1. Scenario First

The user should start from a scenario, not from block internals.

Examples:

- impulse from button
- periodic pulse
- periodic pulse while enabled
- one-button on/off
- separate on and off
- switch signal source

### 2. Internal Block IDs Stay Internal

In `Commissioning`:

- block IDs are auto-generated
- the raw internal ID is hidden
- the user sees a human-readable summary instead

In `Advanced`:

- the ID field is visible
- the user can switch between `auto` and `manual` ID mode

Existing saved blocks currently keep their internal IDs stable.

Safe rename flow can be added later as a separate dependency-aware feature.

### 3. Human Summary Instead of Technical Noise

In simple workflows, the editor should show a short description such as:

- `Импульс на relay1`
- `Периодический импульс на relay1`
- `Вкл/выкл relay1`
- `Переключение сигнала tank_level_selected`

This summary is for the person configuring the block.
The real internal ID remains in the engine/config layer.

### 4. Compact GPIO Assistant

The GPIO assistant should be visually compact and role-based.

Instead of large repeated cards with long labels, it should use short rows:

- `Запуск`
- `Вкл/выкл`
- `Включить`
- `Выключить`

Each row should contain:

- GPIO
- event
- pull-up
- inverted

The assistant should not create noise when it is not needed:

- for interval timer modes it stays hidden by default
- for trigger-driven timer modes it appears only when the user enables button-based control
- for latch modes only the relevant row should be shown:
  - toggle
  - set
  - reset

### 5. Dense but Calm Layout

The editor should reduce empty vertical space while keeping clear sections:

- control source and logic
- output target
- timing
- advanced

Dense does not mean cluttered:

- show only relevant fields
- hide empty sections
- keep helper text short
- use one consistent modal pattern

Timing controls should use user-friendly units:

- `ms`
- `seconds`
- `minutes`
- `hours`
- `days`

The runtime still stores these values as milliseconds.

For interval timers, the editor should present:

- `ON time`
- `OFF time`

instead of forcing the user to think in raw millisecond duration/period or
full-cycle math.

Internally the runtime may still keep a single cycle-based representation.
The UI should convert between:

- displayed `ON time + OFF time`
- stored `ON time + full cycle`

### 6. Advanced Settings Stay Secondary

`Type`, `Mode`, raw `ID`, and fine-grained engineering switches belong to
`Advanced` behavior.

The normal commissioning path should focus on:

- what should trigger the action
- what should be switched
- timing
- button helper chain

The editor should also explain the selected mode in one short inline sentence.

This inline explanation should answer:

- what this mode does
- when it should be used
- what kind of task it is best for

It should reduce the need to open long help popovers for common timer and latch
choices.

The `Advanced` area should be calmer and grouped, not a flat wall of toggles.

Recommended groups:

- service/internal
- behavior flags

### 7. Scenario Choice Belongs Inside the Editor

Quick scenarios should not overload the main `Blocks` screen.

Preferred behavior:

- the main tab stays focused on block lists and block types
- the scenario choice lives inside the block editor modal
- internal `type/mode` stays available mainly for advanced engineering use

## Architecture Guardrails

To avoid future rewrites:

- block editor UX must remain scenario-first
- runtime model must stay `block/signal/channel` based
- no separate display-only or widget-only signal model should be invented
- future editor layers should reuse the same patterns:
  - list
  - filter
  - modal editor
  - dependency review
  - advanced mode

## Current Implementation Scope

This UX spec currently applies first to:

- `Button`
- `Timer`
- `Latch`
- `Selector`

It should later guide:

- `Comparator`
- `Scale/Map`
- `Display widgets`
- `Alarm editor`
- `Sequence editor`
