# TimerService

## Purpose

Stage 6 introduces `TimerService` as the shared deterministic timing layer for future:
- Rules
- Sequence Engine
- AlarmService
- PID guards
- Flowmeter guards
- service and test flows

`TimerService` is a normal object, not a singleton. It never reads a wall clock internally. Every state change is driven by caller-supplied `now_ms`.

## Model

The timer component separates:
- `TimerDescriptor`: static metadata and configuration
- `RuntimeTimerState`: mutable runtime state
- `TimerSnapshot`: read-facing state for future runtime/UI/API consumers

Descriptors are registered in deterministic order and listed in that same order.

## Fake-Time Contract

The service uses an explicit fake-time model:
- no hidden wall clock
- no `sleep`, `delay` or blocking waits
- all timing updates come from `set_input(..., now_ms)`, `start_timer(..., now_ms)`, watchdog operations, `tick(now_ms)` or snapshot reads with explicit `now_ms`
- repeated `tick()` with the same `now_ms` is stable and idempotent

`reset_timer(id)` intentionally has no time parameter. It clears timer runtime flags and preserves the last known `input_state`. A later `tick(now_ms)` can restart input-driven timing from that new explicit timestamp.

## Supported Kinds

### TON

- `set_input(true, now_ms)` starts timing.
- `active=false`, `timing=true` until `elapsed_ms >= duration_ms`.
- After the delay, `active=true`, `timing=false`, `done=true`.
- `set_input(false, now_ms)` resets the timer to idle state.

### TOF

- `set_input(true, now_ms)` makes the timer active immediately.
- A true-to-false input transition starts off-delay timing.
- The timer stays active while the off-delay is timing.
- After the delay, `active=false`, `done=true`.
- A new `set_input(true, now_ms)` cancels off-delay immediately.

### TP

- TP is edge-triggered from `set_input()`.
- A rising edge starts a pulse for `duration_ms`.
- A falling edge does not end the pulse early.
- Project rule: a new rising edge restarts the pulse window from the new `now_ms`.

### MIN_ON

- A rising input turns `active=true` immediately.
- If input falls early, output stays active until minimum on-time is satisfied.
- Once the minimum time is satisfied, output follows the input again.

### MIN_OFF

- When output turns off, an off-block window starts.
- Output must remain off while that block window is active.
- If input is still true after the block expires, output turns on then.

### WATCHDOG

- `arm_watchdog(id, now_ms)` arms and starts the timeout window.
- `kick_watchdog(id, now_ms)` resets the timeout window while armed.
- If the timeout elapses, `expired=true`.
- Expiration is latched until `disarm_watchdog()` or `reset_timer()`.
- Snapshot semantics: `armed` means watchdog supervision is enabled, `active` mirrors that armed watchdog state, `expired` marks the latched timeout fault.

### STARTUP_BYPASS

- `start_timer(id, now_ms)` activates the bypass window immediately.
- `active=true` while the window runs.
- After the duration, `active=false`, `done=true`.
- `stop_timer(id, now_ms)` cancels it and returns to idle state.

### COOLDOWN

- Same core window behavior as `STARTUP_BYPASS`.
- The separate kind exists to preserve intent in future config/runtime modules.

### STATE_MIN_TIME

- `start_timer(id, now_ms)` starts a state minimum-time window.
- `active=true` while the window is running.
- After `duration_ms`, `done=true`.
- `stop_timer(id, now_ms)` resets the timer.

### STATE_MAX_TIME

- `start_timer(id, now_ms)` starts a state maximum-time window.
- `active=true` while the window is running.
- After `duration_ms`, `expired=true`.
- Expiration is latched until `stop_timer()` or `reset_timer()`.

## Operations

Registration and metadata:
- `register_timer(descriptor)`
- `has_timer(id)`
- `get_descriptor(id)`
- `list_descriptors()`

Input-driven operations:
- `set_input(id, bool, now_ms)`

Manual window operations:
- `start_timer(id, now_ms)`
- `stop_timer(id, now_ms)`

Watchdog operations:
- `arm_watchdog(id, now_ms)`
- `kick_watchdog(id, now_ms)`
- `disarm_watchdog(id, now_ms)`

General operations:
- `reset_timer(id)`
- `tick(now_ms)`
- `get_snapshot(id, now_ms)`
- `list_snapshots(now_ms)`

Unsupported operations on a timer kind return structured `TIMER_OPERATION_UNSUPPORTED` errors.

## Structured Results

Stage 6 uses typed status/result objects instead of plain `bool`.

Important error codes:
- `TIMER_ALREADY_REGISTERED`
- `TIMER_NOT_FOUND`
- `TIMER_INVALID_DESCRIPTOR`
- `TIMER_INVALID_DURATION`
- `TIMER_OPERATION_UNSUPPORTED`
- `TIMER_NOT_ARMED`
- `TIMER_ALREADY_ARMED`
- `TIMER_ALREADY_EXPIRED`
- `TIMER_SIGNAL_PUBLISH_FAILED`

## SignalRegistry Publication

When constructed with a `SignalRegistry`, `TimerService` publishes per-timer status signals under a stable prefix derived from the timer id:
- `<id>.active`
- `<id>.timing`
- `<id>.done`
- `<id>.expired`
- `<id>.armed`
- `<id>.input_state`
- `<id>.elapsed_ms`
- `<id>.remaining_ms`

Example for timer id `timer1`:
- `timer1.active`
- `timer1.remaining_ms`

Signal publication is deterministic and update-driven. Publication failures return structured timer errors instead of crashing.

## Postponed

Stage 6 does not implement:
- Rules runtime
- Sequence Engine runtime
- AlarmService runtime
- PID runtime
- Flowmeter runtime
- HTTP API
- Web UI
- MQTT
- ESP-IDF time backend
