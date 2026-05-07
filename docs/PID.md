# PID

## Purpose

Stage 16 adds the standalone portable `PidCore`.
Stage 17 adds `PidService` as the runtime wrapper above that core.

The layering is now:

- `PidCore` for pure control math
- `PidService` for runtime mode handling, source resolution, signal publication and actuator ownership

`PidCore` remains intentionally separated from:

- ESP-IDF
- HAL
- `SignalRegistry`
- `ActuatorManager`
- UI/API/MQTT

## Scope

Stage 16 includes:
- typed `PidConfig`, `PidSnapshot`, `PidResult` and `PidCore`
- explicit `compute(process_value, now_ms)` timing
- direct and reverse action
- output limits and integral limits
- anti-windup
- deadband
- manual, auto and hold modes
- bumpless manual-to-auto transfer
- host-side tests

Current work still postpones:
- stepper or motor binding
- UI, HTTP API and MQTT
- persistent tuning storage
- autotune, feed-forward and cascade control

See `docs/PID_SERVICE.md` for the Stage 17 runtime-service contract.

## Time Model

`PidCore` never reads a wall clock internally.

All updates are driven by explicit caller-supplied `now_ms`.

Rules:
- the first eligible auto compute updates immediately
- later auto computes update only when `sample_time_ms` has elapsed
- an early compute returns `PID_NOT_UPDATED`
- repeated calls with the same `now_ms` are stable and do not advance controller state

## Direction Semantics

Stage 16 uses one explicit sign convention:

- `direct`: `raw_error = setpoint - process_value`
- `reverse`: `raw_error = process_value - setpoint`

This sign convention drives proportional and integral action.

Derivative uses derivative-on-measurement only in this stage.
For direct action, rising process value pushes derivative output negative.
For reverse action, rising process value pushes derivative output positive.

## Deadband

Deadband is applied to the error, not to the measurement delta.

Rule:
- if `abs(raw_error) <= deadband`, `effective_error = 0`
- proportional and integral action use `effective_error`
- integral accumulation is skipped while the error remains inside deadband
- derivative-on-measurement still reacts to eligible process-value changes

Snapshots expose both `raw_error` and `effective_error`.

## Anti-Windup And Limits

The core applies two layers of protection:

- integral term is clamped to `[integral_min, integral_max]`
- final output is clamped to `[output_min, output_max]`

Anti-windup behavior is deterministic:
- the integral candidate is updated first from `effective_error`
- if the combined output saturates high and the current error would push output higher, the integral term is limited so it does not grow beyond the saturation boundary
- if the combined output saturates low and the current error would push output lower, the integral term is limited so it does not grow beyond the low-side saturation boundary

## Modes

### Manual

- output is `manual_output` clamped to output limits
- `compute()` keeps snapshot data coherent but does not run closed-loop PID integration
- manual output can be handed over cleanly to auto mode

### Auto

- proportional, integral and derivative terms are updated on eligible compute steps
- sample-time discipline is enforced by explicit `now_ms`

### Hold

- output remains at `last_output`
- PID state does not evolve
- `compute()` returns `PID_NOT_UPDATED`

## Bumpless Transfer

On transition from manual to auto, the core preloads the integral term to preserve the current output as closely as possible:

`i_term = clamp(current_output - p_term - d_term, integral_min, integral_max)`

In Stage 16 the transfer uses derivative-on-measurement with a zeroed derivative preview at the handoff point, which minimizes the first auto-step output jump.

## Invalid Input Handling

The core rejects invalid numeric runtime input safely:

- non-finite `process_value` returns `PID_INPUT_INVALID`
- non-finite `setpoint` or `manual_output` updates return `PID_INVALID_ARGUMENT`
- runtime state is left unchanged on rejected input

No hidden exceptions or hidden clocks are used.
