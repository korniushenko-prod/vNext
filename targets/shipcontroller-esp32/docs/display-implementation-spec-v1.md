# Display Implementation Spec v1

## Purpose

This document turns `docs/display-model-v1.md` into an implementation-oriented
specification, including the future Web UI surface.

It answers four practical questions:

- what should be stored in config
- what should exist in runtime
- what the user should see in UI
- in what order the display system should be implemented

This is intentionally a `v1` scope:

- small OLED first
- readable and service-friendly
- no parallel logic engine
- no heavy graphics editor

Related documents:

- `docs/display-model-v1.md`
- `docs/ui-architecture-v1.md`
- `docs/implementation-status.md`

## Current State Analysis

What is already good:

- the platform already has `signals`
- runtime blocks already publish useful display-ready values
- the system now has ownership metadata and dependency review foundations
- UI direction is already `scenario-first`
- display config schema is now present in code

What must not be done:

- no separate display-only process variables
- no custom scripting layer inside display widgets
- no second logic model for screens
- no monolithic “screen designer” that ignores signals/blocks ownership

Main architectural rule:

`display is a passive view over signals`

## Product Goals For V1

The first display system must allow the user to:

- choose what local screens exist
- place simple widgets on a screen
- bind widgets to existing signals
- format values in a human-readable way
- show service/commissioning information without reflashing

The first display system does not need:

- freehand canvas editor
- complex vector graphics
- multi-layer animation
- custom scripting
- arbitrary per-widget business logic

## V1 Scope

### Supported display targets

- monochrome OLED first
- future-ready for local HMI pages using the same model

### Supported widget types

- `label`
- `value`
- `status`
- `pair`
- `timer`
- `bar`
- `spacer`

### Supported formatting

- units
- precision
- duration styles
- boolean text
- prefixes/suffixes
- empty text

### Supported conditional visibility

- one optional `visible_if` signal

## Config Specification

## Top-Level Display Config

Recommended JSON shape:

```json
"display": {
  "enabled": true,
  "driver": "ssd1306_128x64",
  "width": 128,
  "height": 64,
  "rotation": 0,
  "startup_screen": "main",
  "default_language": "ru",
  "screens": {}
}
```

Meaning:

- `enabled` turns display system on/off
- `driver` identifies display driver/profile
- `width/height` describe screen geometry
- `rotation` keeps physical mounting configurable
- `startup_screen` defines first screen
- `default_language` aligns display text with UI language model

## Screen Config

Recommended shape:

```json
"main": {
  "label": "Main",
  "group": "operator",
  "visible_if": "",
  "refresh_ms": 500,
  "auto_cycle_ms": 0,
  "widgets": {}
}
```

Meaning:

- `label` is human-readable
- `group` is for future screen grouping:
  - `operator`
  - `commissioning`
  - `service`
- `visible_if` hides screen when a condition is false
- `refresh_ms` controls redraw cadence
- `auto_cycle_ms` allows future rotation

## Widget Config

Recommended shape:

```json
"relay_status": {
  "type": "pair",
  "x": 0,
  "y": 0,
  "w": 128,
  "h": 12,
  "label": "Relay",
  "signal": "relay1",
  "visible_if": "",
  "format": {},
  "style": {}
}
```

Common fields:

- `id`
- `type`
- `x`
- `y`
- `w`
- `h`
- `label`
- `signal`
- `visible_if`
- `format`
- `style`

## Format Config

Supported `format` fields in v1:

- `units`
- `precision`
- `duration_style`
- `true_text`
- `false_text`
- `prefix`
- `suffix`
- `empty_text`

Examples:

- `true_text = "ON"`
- `false_text = "OFF"`
- `duration_style = "mm:ss"`
- `suffix = " L/min"`

## Style Config

Supported `style` fields in v1:

- `font`
- `align`
- `invert`
- `emphasis`
- `frame`
- `color_role`

These are semantic style inputs, not a large graphics system.

## Runtime Specification

## Runtime Layers

### 1. Config Layer

Persistent display definition loaded from `config.json`.

### 2. Resolved Runtime Layer

A runtime resolver should translate:

- `screen ids`
- `widget ids`
- `signal ids`

into efficient runtime links.

Widgets should not perform string lookups in the hot path.

### 3. Render Layer

A renderer reads resolved widget bindings and draws current values.

This layer should be stateless as much as possible.

### 4. Navigation Layer

Tracks:

- active screen
- last render time
- future screen rotation
- future local input navigation

## Required Runtime Structures

Already started:

- `DisplayBinding`
- `DisplayWidgetState`
- `DisplayScreenState`

The next runtime additions should include:

- screen registry or resolved list
- widget-to-signal index resolution
- screen refresh scheduler
- formatter helpers

## Runtime Rules

- display refresh must be slower than fast control logic
- display failures must never block control loop
- missing signal bindings must degrade gracefully
- widgets with invalid bindings must show empty/fault text, not crash

## UI Specification

The Web UI should follow the same architecture rules as Blocks:

- simple in `Commissioning`
- richer in `Advanced`
- same list/editor/help/dependency patterns

## New Tab

Add a future top-level tab:

- `Display`

Mode visibility:

- `Operator`: no editor, maybe later preview only
- `Commissioning`: normal screen/widget editor
- `Advanced`: raw IDs, layout coordinates, style fields, dependency details

## Display Tab Layout

The `Display` tab should have:

### Left column

- screen list
- search
- filter by group

### Center

- selected screen summary
- widget list for selected screen
- quick actions:
  - add screen
  - add widget
  - duplicate screen

### Right or modal editor

- screen editor or widget editor

## Screen Editor UX

Normal commissioning user should see:

- screen name
- screen group
- startup/default flag
- refresh rate
- widgets on screen

Advanced user may also see:

- internal screen ID
- conditional visibility signal
- auto-cycle

## Widget Editor UX

The widget editor should be scenario-first and compact.

The user should first choose what they want to show:

- static text
- one value
- on/off status
- label + value pair
- countdown/timer
- bar/level

Then the editor shows only relevant fields.

### Widget editor sections

1. `What to show`
- widget type
- signal binding
- label

2. `How it should look`
- formatting
- units/precision
- boolean text
- duration style

3. `Placement`
- x/y
- width/height

4. `Advanced`
- internal IDs
- conditional visibility
- style flags

## UX Rules

- do not expose raw coordinates first unless needed
- prefer presets for common layouts
- keep widget editor compact
- use popover help for non-obvious fields
- keep display text human-readable in Russian by default

## Suggested First UI Presets

To avoid a hard layout editor as the first step, support simple presets:

- `Status line`
- `Label + value`
- `Large value`
- `Countdown`
- `Two-row pair`

The preset creates reasonable defaults for:

- widget type
- size
- font
- alignment

## Dependency and Cleanup Rules

Display widgets must participate in the same dependency model as blocks.

That means:

- widget uses signal
- screen owns widgets
- display references must appear in future where-used views
- deleting a signal later must show that it is used on a display

Future `Smart Cleanup Review` must include:

- screen/widget references
- keep/delete decisions
- later detach-only actions

## UX Text Direction

The display editor must follow the same language rules as the rest of the UI:

- Russian default
- English optional
- internal IDs may remain English
- user-facing labels and help must be localized

## Phased Implementation Plan

### Phase 1

- config schema
- config loader
- runtime structs

Done or in progress.

### Phase 2

- display runtime resolver
- widget binding to signal indexes
- formatter helpers

### Phase 3

- one hardcoded renderer that reads resolved config
- support for first screen with first widget set

### Phase 4

- `Display` tab in Web UI
- screen list
- widget editor
- signal binding from dropdown

### Phase 5

- dependency integration
- where-used and cleanup support
- operator preview

## Acceptance Criteria For V1

The display feature is considered working when:

- user can define at least one screen in config/UI
- user can add a few widgets bound to signals
- OLED can show meaningful values from runtime signals
- signal formatting is readable and consistent
- invalid bindings fail safely
- display references are visible in dependency logic

## Non-Goals For V1

- drag-and-drop canvas editor
- animation framework
- programmable widget logic
- custom fonts management UI
- display-side sequences or alarms

## Recommended Immediate Next Step

The next implementation step should be:

- add display runtime resolver
- bind widgets to signal indexes
- add formatter helpers for:
  - number
  - boolean
  - duration
- do not build the full editor yet until resolver/render path exists
