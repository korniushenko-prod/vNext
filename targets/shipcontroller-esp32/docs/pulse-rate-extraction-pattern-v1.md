# Pulse / Rate Extraction Pattern v1

## Purpose

This document defines a reusable pattern for turning raw, analog or already-digital signals into:

- stable digital states
- pulse events
- counts
- engineering rate values
- engineering totals

The goal is to avoid making flowmeter extraction a one-off special case.

This pattern should be reusable for:

- flowmeter pulse extraction
- fan RPM calculation
- motor RPM calculation
- speed or frequency interpretation
- threshold-based event extraction
- analog-to-digital conversion with commissioning visibility

## Core Rule

This is not a magical one-off block.

It is a reusable pattern or module-template built from standard primitives.

That means:

- user-facing: one understandable tuning and extraction workflow
- internally: standard reusable blocks

## Internal Primitive Chain

The default chain should use:

1. `Measured Value`
2. optional `Difference / Conditioning`
3. `Threshold / Window`
4. `Hysteresis / Deadband`
5. optional `Filter / Average`
6. `Edge Detect`
7. optional `Counter / Totalizer`
8. optional `Rate Estimator`
9. optional `Scale / Conversion`

This makes it compatible with:

- pulse extraction
- analog threshold commissioning
- RPM calculation
- flow calculation
- event qualification
- future reusable custom modules

## Supported Source Modes

### 1. `digital_direct`

Use when:

- the input is already a usable digital pulse or state

### 2. `analog_single`

Use when:

- one analog value should be converted into a digital state or pulse

### 3. `analog_diff_pair`

Use when:

- two analog values form the working signal
- for example:
  - `A - B`

### 4. `protocol_or_external`

Use when:

- the source already comes from Modbus or another subsystem
- but still needs standardized event/rate/tuning semantics

## Output Profiles

The pattern must not expose every possible field all the time.

It should work through output profiles.

### 1. `state_only`

Use for:

- stable digital condition
- alarm preparation
- threshold state

Outputs:

- `digital_state`
- `quality`
- `debug_reason`

### 2. `pulse_event`

Use for:

- event extraction
- edge-qualified pulse source

Outputs:

- `digital_state`
- `rising_edge`
- `falling_edge`
- `pulse_event`

### 3. `count_total`

Use for:

- pulse count
- cycle count
- simple totalization

Outputs:

- `count`
- `session_total`
- `resettable_total`
- `lifetime_total`

### 4. `rate_engineering`

Use for:

- RPM
- liters per minute
- pulses per second
- frequency-based engineering values

Outputs:

- `rate_raw`
- `rate_engineering`
- optional moving average

### 5. `flow_totalized`

Use for:

- flowmeter
- total + rate package

Outputs:

- `pulse_count`
- `total_engineering`
- `rate_engineering`
- optional rolling averages

The UI must only show profile-relevant fields.

Examples:

- for fan speed:
  - show `pulses_per_revolution`
  - show `rpm`
  - do not show `tons_24h`
- for flowmeter:
  - show `pulses_per_liter`
  - show `l_min`
  - show totals
  - optional `24h average`

## User-Facing Parameters

The reusable tuning view should expose at least:

- source mode
- source A
- source B when needed
- conditioning mode
- threshold ON
- threshold OFF
- hysteresis
- optional filter strength
- edge mode:
  - rising
  - falling
  - both
- output profile
- engineering scale mode
- debug/preview enable

Optional per use case:

- pulses per revolution
- pulses per liter
- event dead time
- invalid signal handling
- quality/freshness source
- averaging window

## Required Debug View

This pattern must include strong commissioning visibility.

Required live debug fields:

- raw source A
- raw source B when used
- conditioned working signal
- threshold ON
- threshold OFF
- current digital state
- last transition direction
- last edge time
- reason for current state

Profile-specific extras:

- count
- rate raw
- rate engineering
- total engineering

Without this, users cannot tune extraction safely.

## Engineering Conversion Direction

The pattern should support generic engineering conversion after event extraction.

Examples:

- `pulses_per_revolution -> rpm`
- `pulses_per_liter -> liters_per_minute`
- `pulses_per_cycle -> cycles_per_hour`

The pattern should not hardcode one domain's units into another domain's UI.

## Reuse Examples

### Flowmeter

Use for:

- analog differential signal
- pulse extraction
- edge count
- liters per minute
- totalized volume

### Fan RPM

Use for:

- digital tach pulse
- 1..8 pulses per revolution
- engineering output in `rpm`

### Motor RPM

Use for:

- hall sensor or pulse train
- edge count
- `rpm`

### Threshold Alarm Preparation

Use for:

- noisy analog sensor converted into stable warning/trip condition

### General Commissioning Aid

Use for:

- any case where the user needs to see:
  - raw signal
  - conditioned signal
  - digital transition result
  - engineering interpretation

## Product Consequence

The future UI should not hardcode flowmeter tuning as a one-off screen only.

Instead it should offer:

- a reusable `Pulse / Rate Extraction` pattern/template
- then let flowmeter, fan-speed and similar modules use it as one of their building blocks

This keeps:

- the flowmeter strong
- the platform universal
- the config smaller and more relevant per use case

## References

- `docs/flowmeter-pattern-pack-v1.md`
- `docs/universal-block-base-v1.md`
- `docs/russian-pattern-template-registry-v1.md`
