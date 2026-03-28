# Signal Model V1

## Purpose

This document defines the common runtime model for all signals in the controller.

It is the reference for:

- local I/O
- external modules
- bus-integrated values
- virtual values
- manual substitutions
- UI diagnostics
- blocks and sequences

## Core Rule

Everything important in the system must become a signal.

The control engine should operate on signals, not on raw pins or protocol details.

## Signal Definition

A signal is a named runtime object with:

- identity
- value
- type
- units
- source
- quality
- mode
- conditioning
- metadata for UI and service

## Signal Classes

The platform should support the following signal classes.

### Binary Signal

Used for:

- DI
- DO
- interlocks
- status bits
- alarms
- relay commands

Data type:

- `bool`

### Analog Signal

Used for:

- AI
- AO
- temperatures
- pressure
- level
- current/voltage values
- PID process values
- setpoints

Data type:

- `float`

### Counter Signal

Used for:

- pulses
- flowmeter counts
- runtime accumulation
- event counts

Data type:

- `uint32/int32/float`, depending on derived form

### Enum Signal

Used for:

- states
- modes
- selected source
- alarm severity
- sequence phase

Data type:

- `enum/int`

### Text Signal

Used only for service-level metadata.

Examples:

- status message
- device identity
- diagnostics string

Data type:

- `string`

## Signal Source Types

Every signal must declare where its value comes from.

Supported source types:

- `local_di`
- `local_do_feedback`
- `local_ai`
- `local_ao_feedback`
- `counter`
- `frequency`
- `modbus_register`
- `serial_parser`
- `can_value`
- `external_adc`
- `external_dac`
- `virtual`
- `manual`
- `substituted`
- `derived_block_output`

## Signal Directions

Each signal must have a direction model.

Directions:

- `input`
- `output`
- `internal`
- `command`
- `status`

This matters for UI and validation.

## Signal Quality

Each signal must have a runtime quality state.

V1 quality states:

- `good`
- `stale`
- `substituted`
- `fault`
- `out_of_range`
- `uninitialized`

Quality must be visible in:

- signal list
- blocks
- sequences
- service UI

## Signal Modes

Each signal may operate in one of the following modes.

- `auto`
- `manual`
- `local`
- `remote`
- `service`

The active mode must be explicit and observable.

## Signal Attributes

V1 signal attributes:

- `id`
- `label`
- `class`
- `data_type`
- `direction`
- `units`
- `source_type`
- `resource_id` or `device_binding`
- `mode`
- `quality`
- `value`
- `raw_value`
- `timestamp`
- `min`
- `max`
- `default`
- `alarm_profile`
- `ui_visibility`

## Signal Conditioning Pipeline

Each signal may pass through a conditioning chain.

V1 conditioning operations:

- scaling
- offset
- clamp
- inversion
- debounce
- hysteresis
- low-pass filter
- moving average
- rate limit
- plausibility check
- source selection
- substitution
- mapping

Reference flow:

`source -> normalize -> filter -> validate -> clamp -> map -> substitute/select -> publish`

## Raw and Engineering Values

Analog signals should preserve both:

- raw value
- engineering value

Examples:

- raw ADC count
- scaled 4-20 mA current
- engineering temperature or pressure

This is required for diagnostics and calibration.

## Manual and Substitute Behavior

Manual and substituted signals must not be hidden hacks.

Each signal should support:

- optional manual override
- optional substitute source
- timeout or release policy
- visible quality and mode change

Example:

- normal source is `AI1`
- substitute source is `Modbus register 40012`
- service override source is fixed value `55.0`

## Alarm Relationship

Signals do not only carry values.

They can also be alarm-bearing objects.

Signal alarm metadata should support:

- high
- low
- high-high
- low-low
- deviation
- stale timeout
- sensor fault

## UI Expectations

Every signal in the Web UI should show:

- current value
- raw value when applicable
- units
- source
- quality
- mode
- timestamp or freshness
- owner block or sequence if applicable

## Sequence Expectations

Sequences must use signals as their conditions.

Examples:

- permissive signal
- trip signal
- temperature ready signal
- flame detected signal
- pressure valid signal

This keeps sequence logic independent from hardware details.

## Example Use Case

Target scenario:

`4 x 0-20 mA inputs -> proportional or fixed outputs -> optional serial substitution`

Signal view:

- `ai_1_raw`
- `ai_1_eng`
- `ai_1_valid`
- `mapped_output_1`
- `remote_substitute_1`
- `ao_1_command`

The user configures:

- scaling
- valid range
- mapping behavior
- substitution source
- fallback behavior

## Coding Implication

The codebase should evolve toward a dedicated signal runtime object.

Suggested future runtime fields:

- static definition
- current state
- quality state
- mode state
- diagnostics cache
- links to producing and consuming blocks

## V1 Acceptance

Signal Model V1 is accepted when:

- local and remote values use one common signal model
- quality and mode are first-class properties
- blocks and sequences consume signal IDs only
- the UI can inspect and override signals consistently
