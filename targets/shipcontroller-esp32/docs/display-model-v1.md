# Display Model v1

## Purpose

This document defines how local displays and future lightweight HMIs should be
built in the controller.

The main rule is:

`display is a view over signals, not a second logic system`

This means:

- displays do not own separate process values
- displays bind to existing `signals`
- displays may format or combine already-existing values for presentation
- display widgets should not invent a parallel runtime model

## Design Goals

- keep local display configuration understandable for non-programmers
- support small OLED and similar local screens first
- make the same model reusable later for richer local HMI pages
- allow future cleanup, where-used, and ownership tracking
- keep runtime and UI aligned with the existing `signals + blocks + sequences` model

## Core Principles

### 1. Signals First

Every displayed value should come from a signal or from a small display-only
formatting layer over that signal.

Examples:

- relay status
- trigger status
- timer remaining
- time until next pulse
- total liters
- daily total
- temperature
- alarm active

### 2. Widgets Are Passive

Widgets show state.

They do not replace blocks, alarms, or sequences.

They may:

- format values
- map booleans to text
- show colors/icons
- hide themselves when conditions are false

They should not:

- perform control logic
- calculate critical process rules
- become another scripting engine

### 3. One Formatting Layer

Display formatting should be defined centrally so the same signal can be shown
consistently in:

- local display
- future display editor
- service UI
- operator pages

Formatting examples:

- units
- precision
- duration formatting
- boolean text
- enum text
- prefixes/suffixes

### 4. Small, Clear Building Blocks

The first display system should be based on a few reusable widget types, not a
large graphical toolkit.

V1 widget types:

- `label`
- `value`
- `status`
- `pair`
- `timer`
- `bar`
- `spacer`

## Display Object Model

## 1. DisplayConfig

Represents the whole local display feature.

Recommended top-level fields:

- `enabled`
- `driver`
- `width`
- `height`
- `rotation`
- `screens`
- `startup_screen`
- `default_language`

## 2. ScreenDefinition

Represents one screen/page.

Recommended fields:

- `id`
- `label`
- `group`
- `widgets`
- `visible_if`
- `refresh_ms`
- `auto_cycle_ms`

Meaning:

- `group` allows future operator/commissioning/service grouping
- `visible_if` allows conditional screen presence
- `refresh_ms` controls how often this screen is redrawn
- `auto_cycle_ms` allows future screen rotation

## 3. WidgetDefinition

Represents one visual item on a screen.

Recommended fields:

- `id`
- `type`
- `x`
- `y`
- `w`
- `h`
- `label`
- `signal`
- `format`
- `style`
- `visible_if`

## 4. FormatDefinition

Describes how a value should be shown.

Recommended fields:

- `units`
- `precision`
- `duration_style`
- `true_text`
- `false_text`
- `prefix`
- `suffix`
- `empty_text`

## 5. StyleDefinition

Keeps display rendering simple but configurable.

Recommended fields:

- `font`
- `align`
- `invert`
- `emphasis`
- `frame`
- `color_role`

For monochrome OLEDs, `color_role` is still useful as a semantic style input
for:

- normal
- warning
- fault
- active

## Widget Types

### 1. `label`

Static text only.

Use for:

- section names
- captions
- operator hints

### 2. `value`

Shows one bound signal as formatted text.

Use for:

- temperature
- liters
- pressure
- totalizer

### 3. `status`

Shows boolean or quality state with short text.

Use for:

- trigger ON/OFF
- relay ON/OFF
- alarm active
- remote/local

### 4. `pair`

Shows label on one side and value on the other.

Use for:

- `Trigger : ON`
- `Relay : OFF`
- `Total : 123.4 L`

This should likely become the most common V1 widget.

### 5. `timer`

Shows a duration-oriented signal with time formatting.

Use for:

- time remaining
- cooldown time
- next interval

### 6. `bar`

Simple horizontal status or range bar.

Use for:

- level
- percent
- load

### 7. `spacer`

Layout helper for visual rhythm.

## Formatting Rules

### Duration Formatting

Duration signals should be displayable as:

- `ms`
- `s`
- `mm:ss`
- `hh:mm:ss`

Use cases:

- timer remaining
- next pulse in
- purge delay
- cooldown time

### Boolean Formatting

Boolean display should support:

- `ON / OFF`
- `Да / Нет`
- `Открыт / Закрыт`
- `Работает / Стоит`
- custom text

### Numeric Formatting

Numeric display should support:

- precision
- prefix
- suffix
- engineering units

Examples:

- `12.4 L/min`
- `83.2 C`
- `4.0 bar`

## Visibility and Conditions

Widgets and screens should support simple conditional visibility through
signals.

Examples:

- show service screen only in service mode
- show purge countdown only while purge is active
- show remote source line only when remote source is selected

V1 should keep this simple:

- one optional `visible_if` signal reference
- optional inversion flag later if needed

## Navigation Model

The display system should support at least:

- static single screen
- manual screen switching
- future auto-cycle

Navigation inputs may later come from:

- hardware buttons
- resistive keyboard
- encoder
- service UI command

This navigation should still reference the same screen IDs, not a separate
routing system.

## Example Use Cases

### 1. Periodic Compressor Purge

Screen:

- `Trigger : ON`
- `Relay : OFF`
- `On Time : 00:01`
- `Next Pulse : 00:05`

Signals used:

- trigger signal
- relay output signal
- timer active/remaining
- future next-interval signal

### 2. Flowmeter Dashboard

Screen:

- `Flow : 12.5 L/min`
- `Today : 84.3 L`
- `Total : 12345.7 L`
- `Quality : OK`

### 3. Boiler Auxiliary Screen

Screen:

- `Mode : AUTO`
- `Purge : ACTIVE`
- `Burner Cmd : OFF`
- `Temp : 78.4 C`

## Example JSON Shape

```json
{
  "display": {
    "enabled": true,
    "driver": "ssd1306_128x64",
    "width": 128,
    "height": 64,
    "rotation": 0,
    "startup_screen": "main",
    "screens": {
      "main": {
        "label": "Main",
        "refresh_ms": 250,
        "widgets": [
          {
            "id": "relay_status",
            "type": "pair",
            "x": 0,
            "y": 0,
            "w": 128,
            "h": 12,
            "label": "Relay",
            "signal": "relay1",
            "format": {
              "true_text": "ON",
              "false_text": "OFF"
            }
          },
          {
            "id": "timer_remaining",
            "type": "timer",
            "x": 0,
            "y": 16,
            "w": 128,
            "h": 12,
            "label": "Next Pulse",
            "signal": "timer.1.remaining",
            "format": {
              "duration_style": "mm:ss"
            }
          }
        ]
      }
    }
  }
}
```

## Dependency and Cleanup Implications

Display widgets must be tracked in the same dependency system as blocks and
signals.

This is required so the project can later answer:

- where is this signal used
- can this helper signal be deleted
- what display widgets would break if this block disappears

So display references should become part of the future shared dependency graph.

## UI Implications

The future display editor should follow the same pattern as the rest of the UI:

- list of screens
- list of widgets
- modal editor
- help
- dependency visibility
- `Operator / Commissioning / Advanced`

Recommended first tabs or sections:

- `Screens`
- `Widgets`
- `Formatting`
- `Preview`

## Implementation Guidance

V1 implementation order should be:

1. define config schema
2. define runtime structs
3. render one static screen from config
4. add signal binding + formatting
5. add multiple screens
6. add navigation
7. add editor in Web UI

## Boundaries

Display V1 should not try to become:

- a full graphics engine
- a second logic engine
- a complex canvas editor

It should be:

- small
- robust
- signal-driven
- easy to debug
- easy to extend
