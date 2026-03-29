# PulseFlowmeter reference slice v1

## Purpose

`PulseFlowmeter` is the second canonical library slice after `TimedRelay`.

It is intentionally the first object that forces the platform to prove:

1. one public object can support several acquisition modes without splitting into three public types;
2. frontend metadata, monitoring, traces, operations, and persistence can live in one object contract;
3. `ProjectModel -> RuntimePack -> target artifact` can scale from a simple actuator to a measured process object;
4. the platform stays object-first outside, while remaining capability-driven inside.

## Architectural position

`PulseFlowmeter` is a **library leaf object with a native seam**.

Its internal architecture is expressed through facets, not through public `Composition / State / Flow` authoring in v1.
That is deliberate.

The public contract stays small:

- one object;
- three sensor modes;
- one rate output;
- one totalizer output;
- one operation to reset the totalizer.

## Supported modes

`PulseFlowmeter v1` supports exactly three modes:

- `hall_pulse`
- `analog_threshold_pulse`
- `remote_pulse`

The public object is still one `ObjectType`.
Mode choice is done by the `sensor_mode` parameter and by presets, not by creating three unrelated public library objects.

## Public behavior

External behavior:

- accepts pulse-like source input from one of three mode-specific frontends;
- produces `flow_rate`;
- produces `total_volume`;
- reports `source_ok`;
- reports `pulse_seen`;
- exposes `reset_totalizer`;
- can request persistence for the totalizer;
- exposes process/source trace groups;
- defines low/high flow and stale/no-pulse monitors.

## Why this slice matters

`PulseFlowmeter` is the first honest stress test of Phase 1 hardening:

- rich param metadata
- frontend requirements
- monitor descriptors
- runtime operations
- trace groups
- persistence slots
- presets/templates metadata

If this object needs ad-hoc hacks, the capability model is still incomplete.

## What is intentionally not included yet

Not included in PR-13B:

- materializer support
- target emission
- live deploy
- PID logic
- boiler package
- UI canonicalization

Those belong to `PR-13C`, `PR-13D`, and `PR-13E`.

## Files in this slice

- `pulse-flowmeter.object-type.json` — canonical library object contract
- `pulse-flowmeter.project.minimal.json` — minimal project using the object in `hall_pulse` mode

## Decision

`PulseFlowmeter` is the **mandatory next contract slice**.

Nothing larger is allowed before this object has passed:

`ObjectType -> ProjectModel -> materializer-core -> RuntimePack -> esp32-target-adapter -> ShipController artifact`
