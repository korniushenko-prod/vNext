# Block Taxonomy V1

## Purpose

This document defines the first stable taxonomy of functional blocks for the controller platform.

It is the reference for:

- runtime block engine
- config schema
- UI block editor
- diagnostics and service visibility

## Core Rule

Blocks consume signals and produce signals or actions.

Blocks must not depend on:

- GPIO numbers
- board-specific details
- ad hoc project logic

## Implementation Note

For the first practical implementation layer, see:

- `docs/block-spec-v1.md`

That document defines the first operator-facing block family:

- `button`
- `timer`
- `latch`

## V1 Block Families

## 1. Conditioning Blocks

Purpose:

- convert raw or unstable values into usable process signals

V1 block types:

- `scale`
- `offset`
- `clamp`
- `invert`
- `deadband`
- `hysteresis`
- `debounce`
- `low_pass`
- `moving_average`
- `rate_limit`
- `plausibility`
- `range_map`
- `piecewise_map`

Typical use:

- 4-20 mA to engineering units
- noisy button cleanup
- setpoint shaping

## 2. Selection and Routing Blocks

Purpose:

- select between multiple signal sources or destinations

V1 block types:

- `selector`
- `priority_selector`
- `fallback_selector`
- `manual_override`
- `substitute`
- `analog_router`
- `digital_router`

Typical use:

- choose local or remote setpoint
- apply substitute data from serial link
- fallback to local sensor on comm loss

## 3. Logic Blocks

Purpose:

- build deterministic boolean behavior

V1 block types:

- `and`
- `or`
- `xor`
- `not`
- `latch`
- `set_reset`
- `edge_detect`
- `pulse`

Typical use:

- permissives
- start/stop chains
- alarm acknowledgement logic

## 4. Comparator Blocks

Purpose:

- compare analog or numeric signals

V1 block types:

- `greater_than`
- `less_than`
- `equal`
- `window`
- `deviation`
- `change_rate`

Typical use:

- overtemperature
- low pressure
- out-of-range
- unstable signal detection

## 5. Time Blocks

Purpose:

- add time behavior to signals and commands

V1 block types:

- `on_delay`
- `off_delay`
- `pulse_timer`
- `interval_timer`
- `timeout`
- `elapsed_timer`
- `scheduler_basic`

Typical use:

- delayed relay release
- purge timers
- sensor timeout detection

## 6. Control Blocks

Purpose:

- execute process control behavior

V1 block types:

- `pid`
- `two_position`
- `three_position`
- `ramp_soak`
- `setpoint_profile`

Typical use:

- temperature control
- valve and damper control
- staged heating/cooling

## 7. Analog Function Blocks

Purpose:

- transform one or more analog values into a command or derived signal

V1 block types:

- `linear_formula`
- `sum`
- `average`
- `min_select`
- `max_select`
- `difference`
- `ratio`
- `interpolation`

Typical use:

- create proportional outputs
- compare sensors
- create derived process values

## 8. Counter and Flow Blocks

Purpose:

- process pulse and frequency data

V1 block types:

- `counter`
- `frequency`
- `flow_totalizer`
- `runtime_totalizer`
- `batch_counter`

Typical use:

- flow meter
- runtime accumulation
- event counting

## 9. Alarm Blocks

Purpose:

- turn conditions into structured alarms

V1 block types:

- `alarm_limit`
- `alarm_window`
- `alarm_deviation`
- `alarm_stale`
- `alarm_sensor_fault`
- `alarm_latched`

Typical use:

- trip candidate generation
- operator warnings
- event logging

## 10. Protocol and Gateway Blocks

Purpose:

- map signals into communication payloads and back

V1 block types:

- `modbus_read_map`
- `modbus_write_map`
- `serial_frame_decode`
- `serial_frame_encode`
- `register_gateway`
- `value_substitution_from_bus`

Typical use:

- external device integration
- remote signal substitution
- protocol bridging

## 11. Sequence Support Blocks

Purpose:

- help the sequence engine without replacing it

V1 block types:

- `permissive_group`
- `trip_group`
- `state_request`
- `state_ready`
- `lockout_gate`

Typical use:

- clean composition of sequence conditions

## Non-Goals For V1

The following should not be first-wave V1 block priorities:

- heavy script engines
- generic user code execution
- IEC language clones
- complex math libraries
- advanced analytics

## Block Interface Contract

Every block should expose:

- `id`
- `type`
- `enabled`
- `input signal ids`
- `output signal ids`
- `parameters`
- `runtime status`
- `fault state`
- `service visibility`

## Block Runtime Status

Every block should report:

- current output value or state
- active mode
- active source if selected
- current timer phase when relevant
- current alarm state when relevant
- fault or invalid configuration

## UI Expectations

The UI should group blocks by family, not only alphabetically.

Required UI views:

- block list by family
- block detail
- live inputs/outputs
- parameter editor
- status/fault panel

## V1 Priority Blocks

The first implementation wave should include:

- `scale`
- `clamp`
- `debounce`
- `hysteresis`
- `selector`
- `substitute`
- `greater_than`
- `window`
- `on_delay`
- `pulse_timer`
- `pid`
- `alarm_limit`
- `alarm_latched`

## Acceptance

Block Taxonomy V1 is accepted when:

- all normal control logic fits into the defined families
- the UI can expose blocks consistently
- sequences can use blocks without board-level coupling
- common industrial use cases can be configured without custom firmware
