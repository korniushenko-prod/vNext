# Universal Block Base v1

## Purpose

This document fixes the minimum universal block base that all future modules and custom modules should be built from.

The goal is:

- keep blocks small and universal
- avoid turning blocks into mechanism-specific templates
- still have enough vocabulary to build very different automation

This base should support:

- boiler logic
- flowmeter packages
- compressor automation
- BWTS-like systems
- generic marine control tasks

## Core Rule

Blocks are the machine language of the platform.

They are:

- primitive
- universal
- reusable
- not the main user-facing language

Users should mostly work with:

- patterns
- modules
- sequences

But those higher layers must still be made from standard blocks.

## Block Families

### 1. Signal / State Primitives

- `logic_gate`
- `edge_detect`
- `latch`
- `selector`

Use for:

- boolean composition
- event detection
- state memory
- source selection

Required operator direction inside this family:

- `and`
- `or`
- `not`
- `xor`

These are mandatory.

Do not create separate primitive blocks for:

- "using OR"
- "combining logical operators"
- "operator precedence"

Those are documentation or expression-language concerns, not separate runtime block types.

If an expression editor is added later, it should be:

- advanced-only
- optional
- built on top of the same primitive semantics

### 1a. Comparison Primitives

- `comparator`
- `threshold / window`

Required operator direction:

- `gt`
- `lt`
- `ge`
- `le`
- `eq`
- `ne`

Use for:

- numeric comparison
- above / below checks
- equality checks
- range policies
- analog-to-digital decisions

### 2. Timing Primitives

- `timer`
- `pwm`

Required modes:

- `on_delay`
- `off_delay`
- `pulse`
- `min_on`
- `min_off`
- optional `interval_tick`

PWM direction should include at least:

- `fast_pwm`
- `slow_pwm`
- optional `pulse_train`

Why:

- some loads need real PWM duty control
- some relay-driven loads need slow PWM over a long cycle
- both are universal enough to belong in the primitive base

Do not turn this into a giant user-facing timer wizard.

### 3. Analog Decision Primitives

- `threshold / window`
- `hysteresis / deadband`

Use for:

- above/below/window
- analog-to-digital transition
- band control
- noise-resistant switching

### 4. Validity / Supervision Primitives

- `freshness`
- `interlock`
- `mode_authority`

Use for:

- stale / comm loss
- permissive / inhibit / trip
- local/remote/auto/manual/service ownership

### 5. Arithmetic / Conditioning Primitives

Required direction:

- `scale / offset`
- `difference`
- optional `sum`
- optional `clamp`
- optional `average / filter`

These are essential for:

- analog normalization
- differential signals
- flowmeter conditioning
- engineering-unit conversion preparation

### 6. Counting / Aggregation Primitives

Required direction:

- `counter`
- `totalizer`
- `window_aggregator`
- `rate_estimator`

Use for:

- pulse count
- lifetime totals
- rolling totals
- average over time windows
- pulse-based rate calculation

### 7. Sequence Primitive

Not a raw block, but still a primitive execution family:

- `sequence`

Use for:

- named phases
- transitions
- per-state timeouts
- reasons and fault logic

## Minimal Universal Coverage

This base should be enough to build:

### Boiler

- permissives
- trips
- burner sequence
- level on/off control
- flame supervision
- fuel mode policy

### Flowmeter

- analog differential conditioning
- threshold to digital pulse
- edge count
- totalizer
- rate estimator
- 24h average

### PWM / Duty Control

- heater duty control
- proportional relay drive
- simple dosing pulse output
- fan or actuator duty request

### Compressor Automation

- pressure threshold start/stop
- minimum run/stop
- duty/standby alternation
- trip policy

### BWTS-like Systems

- pump and valve packages
- dosing or modulation loops
- wash sequences
- service interlocks

## What Should Not Go Into Blocks

Do not make these first-class raw blocks:

- boiler burner logic
- compressor station package
- flowmeter package
- BWTS train package
- button UX package as a top-level product feature

Those belong one layer above as:

- patterns
- modules
- custom modules
- composites

## Product Consequence

The platform should now explicitly move with this layering:

1. universal blocks
2. universal control patterns
3. standard module templates
4. custom modules
5. composite mechanisms

## Competitor Analysis Direction

This block base should continue to be reviewed against:

- PLC ladder/FBD ecosystems
- ESPHome/Home Assistant automation building blocks
- industrial controller function libraries

The goal of those passes should be:

- not to copy vendor UX
- but to verify that the universal block base is broad enough for variable tasks

That first pass is now captured in:

- `docs/competitor-analysis-universal-block-base-v1.md`

Current conclusion:

- the direction is correct
- `pwm` is confirmed as mandatory
- `rate_estimator` is now treated as part of the practical base
- `window_aggregator` remains mandatory
