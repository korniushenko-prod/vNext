# Block Spec V1

## Purpose

This document formalizes the first practical block family for general-purpose machine logic.

It is intentionally designed to be:

- simple enough for ordinary users
- expressive enough for real automation tasks
- stable enough to drive config, runtime and Web UI

This specification focuses on the first three universal logic blocks:

- `button`
- `timer`
- `latch`

These three blocks cover a very large class of practical scenarios:

- pushbutton control
- pulse and delay logic
- toggle outputs
- set/reset outputs
- periodic actuation
- short press / long press / double press handling

## Design Rule

Do not overload one block with every idea.

Instead:

- `button` handles operator input events
- `timer` handles time behavior
- `latch` handles state retention and toggling

Complex behavior is created by combining small understandable blocks.

This keeps the UI approachable for normal users while still supporting advanced logic.

## UX Rule

Every block editor must support two levels:

### Basic Mode

Show only the fields needed for the selected block type and mode.

Examples:

- a simple pulse timer should show only trigger, output and duration
- a simple toggle latch should show only toggle input and output

### Advanced Mode

Show optional behavior:

- edge selection
- retrigger
- retain state
- reset priority
- start behavior
- timing nuances

The user must not see every possible field by default.

## Block 1. Button

## Purpose

Convert a physical button or other noisy binary input into clean events.

The `button` block should be the normal way to work with operator buttons.

It should own:

- debounce
- edge cleanup
- short press detection
- long press detection
- double press detection
- hold state

### Typical Uses

- start button
- stop button
- local manual control
- service button
- toggling by short or double press

### Inputs

- `input`
  Source binary signal

### Basic Parameters

- `debounce_ms`

### Advanced Parameters

- `long_press_ms`
- `double_press_ms`
- `active_level`

### Runtime Outputs

The block publishes derived signals:

- `<id>.pressed`
- `<id>.released`
- `<id>.short_press`
- `<id>.long_press`
- `<id>.double_press`
- `<id>.held`

### JSON Example

```json
"start_btn_logic": {
  "type": "button",
  "input": "start_btn",
  "debounce_ms": 50,
  "long_press_ms": 800,
  "double_press_ms": 350
}
```

### UI Behavior

Basic Mode fields:

- input
- debounce

Advanced fields:

- long press threshold
- double press threshold
- active level

Help must explain:

- what short press means
- what long press means
- how double press is detected

## Block 2. Timer

## Purpose

Apply time behavior to commands and signals.

The `timer` block is not just one fixed pulse.
It is a time behavior block with multiple modes.

### Supported V1 Modes

- `pulse`
- `delay_on`
- `delay_off`
- `interval`
- `interval_while_enabled`

### Common Parameters

- `mode`
- `output`

### Mode: pulse

Behavior:

- on trigger, activate output for `duration_ms`

Basic fields:

- trigger
- output
- duration_ms

Advanced:

- retrigger
- edge

Typical use:

- press button, open valve for 5 s

JSON:

```json
"valve_pulse": {
  "type": "timer",
  "mode": "pulse",
  "trigger": "start_btn_logic.short_press",
  "output": "valve1",
  "duration_ms": 5000
}
```

### Mode: delay_on

Behavior:

- when trigger becomes true, wait `duration_ms`
- then activate output

Basic fields:

- trigger
- output
- duration_ms

Typical use:

- delayed start of fan or relay

### Mode: delay_off

Behavior:

- while trigger is true, output remains active
- when trigger becomes false, wait `duration_ms`
- then deactivate output

Basic fields:

- trigger
- output
- duration_ms

Typical use:

- keep fan running after process ends

### Mode: interval

Behavior:

- periodically activate output
- on time = `duration_ms`
- full cycle = `period_ms`

Basic fields:

- output
- duration_ms
- period_ms

Advanced:

- start_immediately

Typical use:

- every 30 s turn on pump for 5 s

JSON:

```json
"pump_cycle": {
  "type": "timer",
  "mode": "interval",
  "output": "pump1",
  "duration_ms": 5000,
  "period_ms": 30000
}
```

### Mode: interval_while_enabled

Behavior:

- while `enable` is true:
  - periodically activate output
  - on time = `duration_ms`
  - cycle = `period_ms`

Basic fields:

- enable
- output
- duration_ms
- period_ms

Typical use:

- while purge mode is enabled, pulse valve every 5 min for 5 s

JSON:

```json
"purge_cycle": {
  "type": "timer",
  "mode": "interval_while_enabled",
  "enable": "purge_enable",
  "output": "purge_valve",
  "duration_ms": 5000,
  "period_ms": 300000
}
```

### Timer Runtime Outputs

The block publishes:

- `<id>.active`
- `<id>.remaining_s`
- `<id>.elapsed_s`
- `<id>.state`

Optional aggregate signals may still exist:

- `timer.remaining`

But per-block signals are the primary model.

### Timer UI Behavior

Basic Mode:

- select mode
- show only fields needed for that mode

Examples:

- `pulse`: trigger, output, duration
- `interval`: output, period, duration
- `interval_while_enabled`: enable, output, period, duration

Advanced Mode:

- retrigger
- edge mode
- start immediately
- min off time
- min on time

Help popovers must explain the chosen mode in plain language.

## Block 3. Latch

## Purpose

Hold an output state until another condition changes it.

This is the correct block for toggle and set/reset logic.
It must not be faked with timer hacks.

### Supported V1 Modes

- `toggle`
- `set_reset`
- `set_only`
- `reset_only`

### Mode: toggle

Behavior:

- every valid event on `toggle_input` flips the output state

Basic fields:

- toggle_input
- output

Advanced:

- initial_state
- retain

Typical use:

- press once to open
- press again to close

JSON:

```json
"valve_toggle": {
  "type": "latch",
  "mode": "toggle",
  "toggle_input": "start_btn_logic.short_press",
  "output": "valve1"
}
```

### Mode: set_reset

Behavior:

- `set_input` turns output on
- `reset_input` turns output off

Basic fields:

- set_input
- reset_input
- output

Advanced:

- reset_priority
- retain

Typical use:

- one button opens
- another button closes

JSON:

```json
"valve_sr": {
  "type": "latch",
  "mode": "set_reset",
  "set_input": "open_btn_logic.short_press",
  "reset_input": "close_btn_logic.short_press",
  "output": "valve1"
}
```

### Mode: set_only

Behavior:

- `set_input` activates output
- output remains active until externally reset by another block or service action

### Mode: reset_only

Behavior:

- `reset_input` deactivates output

### Latch Runtime Outputs

The block publishes:

- `<id>.state`
- `<id>.set_seen`
- `<id>.reset_seen`

### Latch UI Behavior

Basic Mode:

- mode
- output
- required inputs for mode

Advanced:

- initial state
- retain
- reset priority

## Scenario Mapping

These examples show how practical behavior is created.

### 1. Press button -> open for 5 seconds

- `button`
- `timer(mode=pulse)`

### 2. Every 30 seconds open for 5 seconds

- `timer(mode=interval)`

### 3. While trigger is active, every 5 minutes open for 5 seconds

- `timer(mode=interval_while_enabled)`

### 4. Press button -> open, press again -> close

- `button`
- `latch(mode=toggle)`

### 5. One button opens, another closes

- `button(open)`
- `button(close)`
- `latch(mode=set_reset)`

### 6. Short press -> pulse, double press -> keep active until next double press

- `button`
- `timer(mode=pulse)` triggered by `short_press`
- `latch(mode=toggle)` triggered by `double_press`

## Simplicity Strategy

To stay understandable for ordinary users:

- blocks must have plain-language names in UI
- each mode should show a short one-line explanation
- mode-specific fields only
- advanced settings hidden by default
- examples and help popovers available directly in the editor

## Runtime Strategy

These blocks must be safe for ESP32 runtime.

The firmware does not execute JSON as code.

Instead:

1. JSON is parsed once
2. Block definitions are converted into runtime objects
3. Signal links are resolved into indexes/handles
4. The loop runs on resolved runtime state

This means many configured timers or latches do not imply bad performance by themselves.

## Runtime Rule

Configuration uses readable IDs.

Runtime uses resolved references.

Examples:

- config stores `trigger: "start_btn_logic.short_press"`
- runtime stores `triggerSignalIndex = 12`

This is required for predictable performance and reliability.

## Next Implementation Step

Implementation should proceed in this order:

1. extend `BlockType` with `button` and `latch`
2. extend `BlockConfig` for mode-specific fields
3. implement `button` runtime and outputs
4. implement `timer` modes
5. implement `latch` modes
6. update Blocks UI to show mode-specific forms
7. add contextual help popovers for each mode

## V1 Outcome

After this block family is implemented, the platform will support:

- clean button handling
- pulse and delay logic
- interval logic
- toggle and set/reset logic
- composition of simple blocks into more advanced behavior

This is the correct foundation before moving on to:

- comparators
- alarms
- PID
- sequence engine
