# StepperService

## Purpose

`StepperService` is the Stage 19 runtime abstraction for a single stepper-based mechanism.

It provides:
- enable/disable state
- optional homing requirement
- move to absolute steps
- move to percent position
- manual jog
- home, limit and fault signal handling
- open-loop position tracking
- bounded history and runtime signal publication

This stage is intentionally single-axis and open-loop.

## Why It Is Standalone In Stage 19

For the MVP, `StepperService` talks directly to:
- `StepperHal`
- `SignalRegistry`

It does not go through `ActuatorManager` yet because:
- there is no generic stepper arbitration model there yet
- Sequence/Logic do not issue stepper actions in this stage
- the goal of Stage 19 is to land working homing/move/jog runtime first

Generic multi-owner stepper arbitration is postponed to a later stage.

## StepperHal Role

`StepperHal` stays low-level and hardware-agnostic.
Stage 19 uses only:
- `initialize()`
- `set_enabled()`
- `get_enabled()`
- `set_direction()`
- `get_direction()`
- `set_step_rate_hz()`
- `get_step_rate_hz()`
- `stop()`
- `emergency_stop()`

High-level logic such as homing, limit handling, target tracking and percent mapping remains in `StepperService`.

## Runtime States

Stage 19 runtime states:
- `disabled`
- `need_homing`
- `homing`
- `ready`
- `moving`
- `manual_jog`
- `fault`

State transitions are driven only by explicit commands, `tick(now_ms)` and current signal state.

## Homing Semantics

Homing uses:
- `home_direction`
- `home_speed_steps_per_sec`
- `home_signal_path`

When homing starts:
- runtime enters `homing`
- the service commands HAL direction and step rate

When the home signal becomes true:
- motion stops
- `position_steps` is set to `home_position_steps`
- `homed=true`
- runtime returns to `ready`

If the home signal is unreadable while homing:
- motion is stopped
- runtime enters `fault`
- the read failure is surfaced as a structured result

If `home_required_on_boot=true`, move and jog commands are rejected until homing completes.

## Move And Jog

`move_to_steps()`:
- validates target against `min_steps..max_steps`
- chooses direction from current position
- runs at `move_speed_steps_per_sec`
- returns to `ready` when target is reached

`move_to_percent()`:
- maps `0..100` into `min_steps..max_steps`
- then uses the same runtime path as `move_to_steps()`

`start_jog()`:
- runs continuously at `jog_speed_steps_per_sec`
- stops on explicit `stop()`, limit reach, fault or range clamp

## Limit And Fault Handling

Optional limit inputs are read from `SignalRegistry`:
- `limit_min_signal_path`
- `limit_max_signal_path`

If the active motion direction reaches a configured limit:
- motion stops immediately
- position clamps to `min_steps` or `max_steps`
- runtime returns to `ready`
- a `limit_reached` history event is recorded

Optional fault input is also read from `SignalRegistry`.
When it resolves true:
- motion stops immediately
- runtime enters `fault`
- `fault_reason` is populated
- runtime does not auto-recover

`clear_fault()` succeeds only after the external fault condition clears.

## Position Model

Stage 19 position tracking is:
- explicit-time
- deterministic
- open-loop

`StepperService` owns commanded position tracking itself.
Motion advances only inside `tick(now_ms)`.

This stage accepts open-loop commanded position as the MVP tradeoff.
Persistent encoder-backed absolute position is postponed.

## Signal Publication

When `publish_signals=true`, `StepperService` publishes:
- `stepper.<id>.enabled`
- `stepper.<id>.runtime_state`
- `stepper.<id>.homed`
- `stepper.<id>.need_homing`
- `stepper.<id>.moving`
- `stepper.<id>.position_steps`
- `stepper.<id>.position_percent`
- `stepper.<id>.target_steps`
- `stepper.<id>.target_percent`
- `stepper.<id>.direction`
- `stepper.<id>.command_speed_steps_per_sec`
- `stepper.<id>.fault`
- `stepper.<id>.fault_reason`
- `stepper.<id>.home_signal`
- `stepper.<id>.limit_min`
- `stepper.<id>.limit_max`
- `stepper.<id>.last_reason`
- `stepper.<id>.update_counter`

## Intentionally Postponed

Stage 19 does not add:
- Stepper UI
- HTTP API
- MQTT
- PID integration
- Logic/Sequence stepper actions
- generic `ActuatorManager` stepper arbitration
- advanced acceleration or jerk-limited motion planning
- multi-axis coordination
- persistent encoder-backed absolute position
