# Flowmeter Pattern Pack v1

## Purpose

This document defines the first correct pattern decomposition for a flowmeter package.

The goal is not to model a flowmeter as:

- one magical block
- or one giant vendor-specific template

The goal is to model it as a reusable chain of universal patterns that can later become:

- a standard module
- a custom module
- a reusable company/vessel template

## Core Rule

A flowmeter is not only a sensor.

It usually needs several pattern layers:

1. source acquisition
2. signal conditioning
3. pulse detection
4. counting / totalization
5. rate estimation
6. conversion / compensation
7. alarms / service

## Supported Source Modes

The flowmeter module should support at least these source modes.

### 1. `digital_single`

Use when:

- the device already gives a clean digital pulse

### 2. `analog_single_threshold`

Use when:

- one analog signal should be turned into a pulse by threshold/hysteresis

### 3. `analog_diff_pair`

Use when:

- two analog channels form the working signal
- for example `A - B`

### 4. `external_or_protocol`

Use when:

- pulse, total or rate already comes from Modbus or another controller

## Pattern Chain

The preferred internal chain is:

1. `Measured Value`
2. `Difference / Conditioning`
3. `Threshold / Hysteresis`
4. `Edge Detect`
5. `Counter / Totalizer`
6. `Rate Estimator`
7. `Rolling Window Aggregator`
8. `Conversion / Compensation`
9. `Alarm / Policy`

## Detailed Breakdown

### 1. Measured Value

Needed when the source is analog.

Examples:

- analog channel A
- analog channel B

Outputs:

- `value`
- `quality`
- `fault`

### 2. Difference / Conditioning

Needed for differential analog flowmeter wiring.

Example:

- `working_signal = A - B`

This should remain a standard reusable conditioning step.

### 3. Threshold / Hysteresis

Converts the conditioned analog signal into a digital state.

Required behavior:

- threshold on
- threshold off
- hysteresis
- debug visibility

The user must be able to see:

- current analog input
- threshold ON
- threshold OFF
- current digital state
- reason for current state

This is critical for commissioning.

### 4. Edge Detect

The pulse should be counted by edge, not by level.

Recommended:

- count `rising edge`

Possible options later:

- rising
- falling
- both

### 5. Counter / Totalizer

This layer should provide:

- `pulse_count`
- `session_total`
- `resettable_total`
- `lifetime_total`

Persistence rule:

- do not write flash on every pulse
- save in batches or by threshold/time policy

### 6. Rate Estimator

This should provide:

- instantaneous flow
- short moving average

Possible methods:

- by time between pulses
- by pulse count in short window

### 7. Rolling Window Aggregator

This is required for:

- `24h average flow`

Recommended implementation direction:

- bucketed rolling buffer
- for example:
  - `24 x 1h`
  - or `96 x 15min`

Do not implement 24h average as a naive single arithmetic shortcut.

### 8. Conversion / Compensation

This layer should later support:

- pulses -> liters
- liters -> m3
- liters -> mass
- density compensation
- temperature compensation

V1 minimum:

- pulses -> engineering total
- engineering total -> average rate

### 9. Alarm / Policy

Possible alarms:

- no pulses
- rate too low
- rate too high
- analog source fault
- quality stale
- impossible pulse pattern

## Recommended User-Facing Shape

The normal user should not assemble all internal blocks manually.

The preferred user-facing module is:

- `Flowmeter Module`

With source mode:

- `digital pulse`
- `analog threshold`
- `analog differential`
- `external/protocol`

Then the user configures:

- source bindings
- threshold/hysteresis if needed
- edge mode
- pulses per unit
- totalizer policy
- averaging window
- alarms

Reference:

- `docs/pulse-rate-extraction-pattern-v1.md`

## Internal Components Of The Flowmeter Module

The module should internally consist of standard reusable parts:

- `Measured Value Module` for analog inputs
- optional `Difference / Conditioning`
- `Threshold / Window`
- `Hysteresis`
- `Edge Detect`
- `Counter / Totalizer`
- `Rolling Window Aggregator`
- optional `Conversion / Compensation`
- `Alarm Policy`

This keeps the flowmeter package aligned with the universal controller model.

Important clarification:

- the signal extraction and threshold tuning part should be reusable outside flowmeter
- it should become a shared `Pulse / Rate Extraction` pattern
- flowmeter should use that shared pattern instead of owning a one-off tuning concept

## Debug / Service Requirements

The flowmeter package must expose a strong debug view.

Required service visibility:

- active source mode
- raw analog inputs
- conditioned working signal
- threshold on / off
- current digital pulse state
- last edge time
- pulse counter
- session total
- lifetime total
- short-term flow
- 24h average
- current alarm/fault

## Example Chains

### Digital Pulse Source

- digital input
- edge detect
- counter
- rate estimator
- 24h average

### Analog Single Threshold

- analog input
- threshold/hysteresis
- digital state
- edge detect
- counter
- rate estimator

### Analog Differential Pair

- analog A
- analog B
- subtract
- threshold/hysteresis
- digital state
- edge detect
- counter
- rate estimator

## Relation To Custom Modules

The flowmeter package is a strong candidate for:

- a standard library module
- or a user-created custom module

Especially because vessels often have:

- different sensor wiring
- different pulse semantics
- different totalizer needs
- different compensation logic

## Immediate Direction

The next rule is now fixed:

- the flowmeter should be modeled as a reusable pattern pack
- not as one raw block chain exposed directly to ordinary users
