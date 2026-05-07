# PID Service

## Purpose

`PidCore` and `PIDService` solve different problems.

- `PidCore` owns pure PID math only.
- `PIDService` is the runtime wrapper that connects PID loops to:
  - `SignalRegistry` for PV/SP read and state publication
  - `ActuatorManager` for owned PWM output requests

Stage 17 keeps this layer portable C++17 and fully host-side testable.

## Scope

Stage 17 includes:

- typed `PidServiceDescriptor`, `PidServiceSnapshot`, `PidServiceHistoryEntry` and `PidService` APIs
- constant and signal-backed setpoint sources
- runtime modes: `disabled`, `manual`, `auto`, `hold`, `fault`
- deterministic `SignalRegistry -> PIDService -> ActuatorManager` flow
- bounded in-memory history
- per-loop PID runtime publication through `SignalRegistry`

Stage 17 intentionally postpones:

- UI, HTTP API, MQTT
- autotune, feed-forward and cascade control
- persistent tuning/history storage
- stepper, motor or positional output targets

## Requested Vs Effective Mode

`requested_mode` is the operator/runtime intent.

`effective_mode` is what actually runs after runtime constraints are applied.

Rules:

- if `enabled == false`, `effective_mode = disabled`
- if a runtime source fault is active, `effective_mode = fault`
- otherwise `effective_mode = requested_mode`

In this stage `fault` is a runtime/effective state, not a normal requested control mode.

## PV And SP Sources

PV is always read from `SignalRegistry` by `pv_signal_path`.

SP can come from:

- `constant`
- `signal`

Only numeric signals are accepted:

- `int64`
- `double`

`bool` and `string` sources are treated as source faults.

Missing signals are not registration errors in this stage.
They become deterministic runtime faults during `tick(now_ms)`.

## Fault Policy

Runtime faults are non-latching in Stage 17.

Source behavior:

- missing signal: always fault
- type mismatch: always fault
- `fault == true` on the signal snapshot: always fault
- `valid == false` faults only when `invalid_as_fault == true`
- `stale == true` faults only when `stale_as_fault == true`

When sources recover on a later tick:

- runtime fault clears automatically
- `effective_mode` returns to the prior requested non-fault mode
- output ownership resumes according to that mode

Output clearing behavior:

- `disabled` clears owned PID requests
- `fault` clears owned PID requests when `fault_clears_output == true`
- `hold` keeps the last owned PID output request active

## PWM Output Integration

Stage 17 supports PWM targets only.

Validation rejects:

- unknown target ids
- non-PWM targets
- descriptors that request non-PWM target kinds

All output commands go through `ActuatorManager` using:

- `priority = PID`
- `owner = pid:<id>`
- a human-readable `reason`

`PIDService` does not drive relays directly and does not bypass arbitration.

## Signal Publication

Per-loop publication uses `pid.<id>.*` signals including:

- enabled/requested/effective mode
- fault/fault reason
- pv/sp
- error terms and PID terms
- commanded output
- saturation flags
- updated / last compute time

Global publication also includes:

- `pid.any_active`
- `pid.active_count`

The published `output` reflects the controller's current commanded output request, not only the latest compute attempt.

## History

Stage 17 keeps a bounded in-memory history with deterministic drop-oldest behavior.

Tracked events include:

- registration
- mode and enable changes
- fault entered / fault cleared
- setpoint and manual-output changes
- integral reset
- output requested / output cleared

This history is runtime-only and intentionally not persisted yet.
