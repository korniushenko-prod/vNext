# Actuators

Stage 5 adds the `ActuatorManager` component in `firmware/components/actuators`.

## Scope

This stage includes:
- typed relay targets
- typed PWM targets
- typed actuator requests
- fixed priority arbitration
- deterministic same-priority tie-breaks
- relay interlock groups
- safe fallback behavior
- SignalRegistry publishing
- mock HAL application
- runtime snapshots with owner, reason and priority

This layer now also includes Stage 18 `MotorService`, which is a higher-level runtime abstraction built on top of existing actuator targets.
Stage 19 adds `StepperService` as a specialized single-axis runtime abstraction above `StepperHal` plus `SignalRegistry`.

Current actuator-related non-goals:
- closed-loop motor speed control
- logic, sequence, PID or alarm evaluation inside `ActuatorManager`
- HTTP API, Web UI, MQTT or ESP-IDF backends

## Priority Order

Higher priorities always win over lower priorities:

1. `Safety`
2. `Trip`
3. `Inhibit`
4. `Service`
5. `Manual`
6. `Sequence`
7. `PID`
8. `AutoRule`
9. `Schedule`
10. `Default`

`Default` is used by safe fallback snapshots when no active request owns the target.

## Determinism

For multiple requests on the same target:
- higher priority wins
- if priorities are equal, lexicographically smaller `owner` wins
- if priority and owner are equal, lexicographically smaller `reason` wins

For relay interlock conflicts:
- the relay with the highest effective request priority wins
- if priorities are equal, lexicographically smaller target id wins
- the losing relay is forced `OFF`
- the losing relay snapshot reason becomes `interlock_blocked_by:<winner_target_id>`

## Safe Fallback

When no active request owns a target, `ActuatorManager` applies safe fallback.

Relay fallback:
- drives the configured relay `safe_state`

PWM fallback:
- drives the configured `duty_safe`
- forces `enabled = false`

Fuel and ignition roles must fail safe `OFF` when unowned or faulted.

## Signal Paths

Per relay target:
- `actuators.<target_id>.effective.on`
- `actuators.<target_id>.meta.owner`
- `actuators.<target_id>.meta.reason`
- `actuators.<target_id>.meta.priority`
- `actuators.<target_id>.meta.safe_fallback`

Per PWM target:
- `actuators.<target_id>.effective.enabled`
- `actuators.<target_id>.effective.duty_percent`
- `actuators.<target_id>.meta.owner`
- `actuators.<target_id>.meta.reason`
- `actuators.<target_id>.meta.priority`
- `actuators.<target_id>.meta.safe_fallback`

## Usage Sketch

Typical flow:

1. Initialize mock or real HAL implementations.
2. Register relay and PWM targets with `ActuatorManager`.
3. Submit requests that include `target_id`, `owner`, `reason` and `priority`.
4. Call `evaluate(now_ms)` to arbitrate, apply outputs and publish signals.
5. Read snapshots or SignalRegistry values for effective state and reasoning.

## Testing

Host-side coverage for this stage lives in `tests/actuators`:
- registration and safe fallback
- invalid PWM range rejection
- fixed priority arbitration
- relay interlock winner/loser behavior
- SignalRegistry publishing of effective state and metadata
- `MotorService` descriptor/runtime/history/error coverage
- `StepperService` descriptor/runtime/history/error coverage

## MotorService

Stage 18 adds `MotorService` above `ActuatorManager` for PWM-driven DC motors.

`MotorService` owns:
- typed motor descriptors, commands, snapshots and history
- open-loop run/stop/speed/direction behavior
- soft start, soft stop, start boost and reverse delay
- optional fault/tach reads from `SignalRegistry`
- runtime counters and per-motor signal publication

`MotorService` does not duplicate:
- PWM duty ownership
- actuator priority arbitration
- relay/PWM HAL access

Those concerns remain in `ActuatorManager`.

## StepperService

Stage 19 adds `StepperService` as a narrow runtime layer for one stepper-based mechanism.

`StepperService` owns:
- typed stepper descriptors, snapshots, history and structured result codes
- explicit-time open-loop position tracking
- homing, absolute/percent moves and manual jog
- home, limit and fault signal handling through `SignalRegistry`
- direct low-level enable/direction/rate control through `StepperHal`

Stage 19 intentionally does not route stepper commands through `ActuatorManager`.
Generic stepper arbitration and owner/priority coordination are postponed to a later stage once more than one runtime producer needs the axis.
