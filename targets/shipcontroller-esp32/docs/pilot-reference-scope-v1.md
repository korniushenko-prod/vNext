# Pilot Reference Scope v1

## Purpose

This document fixes the role of the two current pilot reference projects:

- `Boiler`
- `Flowmeter`

They are not the product abstraction.

They are the current functional stress-tests for the universal controller architecture.

## Core Rule

The product remains:

- universal control patterns
- universal primitive block base
- module templates
- custom modules
- composite mechanisms

The pilot references exist only to verify that the architecture is broad enough.

## Pilot 1: Boiler

`Boiler` is the complex orchestration stress-test.

It validates:

- parallel lanes
- on/off control
- PID support
- actuator patterns
- supervision
- interlock / permissive / trip
- sequence / phase logic
- authority / takeover
- service / explanation view

Typical validated patterns:

- measured values
- threshold / window
- hysteresis
- on/off control
- PID
- actuator
- sequence
- alarm / trip policy

## Pilot 2: Flowmeter

`Flowmeter` is the signal-processing and accumulation stress-test.

It validates:

- source normalization
- analog conditioning
- threshold to digital conversion
- edge detection
- counting
- totalization
- rolling averages
- conversion / compensation
- persistent totals
- service diagnostics for signal tuning

Typical validated patterns:

- measured value
- difference / conditioning
- threshold / comparator
- hysteresis
- edge detect
- counter
- totalizer
- window aggregator
- rate estimator
- conversion / compensation

## Why These Two Together

These two pilots are intentionally different.

`Boiler` proves:

- orchestration
- policy
- protection
- multi-module interaction

`Flowmeter` proves:

- signal path correctness
- pulse and rate logic
- accumulation
- calibration-oriented diagnostics

Together they validate both:

- complex control logic
- complex measurement and accumulation logic

## Product Consequence

The immediate architecture should now be judged by one question:

Can the same universal base cover both:

- a boiler-like orchestration system
- a flowmeter-like signal and totalization system

If yes, the direction is correct.

If not, the base is still too narrow.

## Immediate Working Rule

Do not optimize the product around boiler-only semantics.

Do not optimize the product around flowmeter-only semantics.

Instead:

- stabilize the universal primitive base
- stabilize the universal pattern library
- align module templates and UI with that base
- use boiler and flowmeter only as validation references
