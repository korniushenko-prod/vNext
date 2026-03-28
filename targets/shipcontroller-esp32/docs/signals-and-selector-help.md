# Signals And Selector Help

## Core Idea

The controller should be understood as:

`resource -> channel -> signal -> block`

- `resource` is physical or protocol attachment
- `channel` is configured local I/O usage
- `signal` is the runtime value the system reasons about
- `block` transforms or routes signals

## Resource

A resource is where the controller can physically attach.

Examples:

- GPIO input
- GPIO output
- ADC input
- future Modbus register
- future RS485 value

Resources answer:

- what exists physically
- what capabilities it has
- whether it is safe to use

## Channel

A channel is a project binding of a resource.

Examples:

- `input1` uses `GPIO34` as `DI`
- `relay1` uses `GPIO25` as `DO`
- `tank_level_raw` uses `GPIO35` as `AI`

Channels answer:

- how the project uses the hardware

## Signal

A signal is the runtime meaning of a value.

Examples:

- `input1`
- `tank_level_selected`
- `timer.1.remaining`
- `pressure_alarm_request`

Signals answer:

- what value logic and UI should operate on

### Why signals exist

Signals let the system reason without caring whether the value came from:

- local GPIO
- local ADC
- a derived substitution
- a timer block
- later Modbus, RS485, or other buses

### Important fields

- `id`: unique runtime name
- `label`: readable UI name
- `class`: binary, analog, counter
- `units`: C, bar, %, l/min, s, mA
- `value`: engineering value
- `raw`: original underlying value if useful
- `quality`: good, stale, substituted, fault
- `mode`: auto, manual, service

### Why units matter

Units keep numbers meaningful in UI and debugging.

Examples:

- `82.4 C`
- `4.8 bar`
- `65 %`
- `12.0 s`

Without units, values become much harder to trust and compare.

## Types Of Signals

### Resource-backed

These mirror configured local channels.

Examples:

- `input1`
- `relay1`
- `ai_level`

### Derived

These are defined from other signals.

Examples:

- `tank_level_selected`
- `manual_speed_reference`

### Runtime / Block Output

These are published by logic blocks.

Examples:

- `timer.1.remaining`
- `timer.1.active`

## Substitute Signal

The current UI already supports a derived signal type called `substitute`.

It works like this:

- when `enable` is false, output follows `source`
- when `enable` is true, output follows `substitute`

Use cases:

- service override
- fallback value
- bench testing
- remote/manual replacement

## Selector Block

The next step is a real `selector` block.

The selector block chooses one input signal from several possible inputs and publishes one output signal.

Typical form:

- input A
- input B
- select signal or mode
- output signal

Use cases:

- choose local sensor vs remote sensor
- choose auto setpoint vs manual setpoint
- choose primary vs backup source
- route one of several process values into later logic

### Difference Between substitute and selector

- `substitute` is a simple override-oriented signal definition
- `selector` is a reusable logic block for routing between inputs

## Recommended Mental Model

When building a project:

1. Create hardware resources and channels
2. Let local channels become basic signals
3. Create derived signals when you need substitution or service behavior
4. Add blocks when you need comparison, timing, mapping, selection, or control

## Quick Rule

- physical thing: `resource`
- project I/O binding: `channel`
- runtime value: `signal`
- transformation/routing/control: `block`
