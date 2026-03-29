# PIDController reference slice v1

## Purpose

`PIDController` is the third canonical vertical family after `TimedRelay` and `PulseFlowmeter`.

It is intentionally the first **control object** in the library roadmap.
That makes it the right boundary between:

- infrastructure already hardened;
- sensor/process objects already proven;
- control-loop semantics that must now be expressed without leaking UI, boiler logic, or autotune complexity into the core.

## Scope of PR-14A

`PR-14A` defines only the **contract** for `PIDController v1`.

Included:

- public ports;
- rich parameter metadata;
- native seam;
- frontend requirements;
- operations;
- trace groups;
- monitors;
- persistence slots;
- presets.

Not included yet:

- materializer support;
- target emission;
- autotune execution;
- boiler-specific logic;
- UI canonicalization.

## Public ports

Inputs:

- `pv`
- `sp`
- `enable_cmd`
- `mode_cmd`
- `manual_mv`

Outputs:

- `mv_out`
- `loop_ok`
- `in_auto`
- `saturated`

## Parameter set

`PIDController v1` carries only the disciplined base loop parameters:

- `kp`
- `ti`
- `td`
- `sample_time_ms`
- `output_min`
- `output_max`
- `direction`
- `pv_filter_tau_ms`
- `deadband`

No cascade, split-range, feed-forward, or vendor tuning extensions are allowed in v1.

## Operations

The base operations are:

- `reset_integral`
- `hold`
- `release`

Autotune is intentionally excluded from the base contract and must arrive only as a separate operation contract in `PR-14E`.

## Monitoring and traces

Trace groups:

- `control_loop`
- `mode`

Monitors:

- `pv_stale`
- `output_saturated`
- `manual_override_active`

## Persistence and presets

Persistence slots currently cover tuning parameters:

- `kp`
- `ti`
- `td`

Initial presets:

- `fast_loop`
- `slow_process`
- `temperature_loop`

## Decision

`PIDController v1` is the mandatory next contract slice.

Nothing larger is allowed before the following path is later closed in `PR-14B .. PR-14D`:

`ObjectType -> ProjectModel -> materializer-core -> RuntimePack -> esp32-target-adapter -> ShipController artifact`
