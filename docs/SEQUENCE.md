# Sequence Engine

## Purpose

Sequence Engine is the generic runtime for step-by-step process programs.

A sequence program is a typed set of states and transitions.
The engine runs one active program at a time and drives:
- state entry, active and exit actions
- guard checks
- transition checks
- min/max state timing
- normal stop and trip branching
- lockout and reset behavior

This stage adds the generic engine only.
Templates, editors, HTTP transport and UI are intentionally postponed.

Stage 20 adds a separate safe scaffold layer in `ProgramSkeletonBuilder`.
That builder generates disabled-by-default sequence skeletons for later review, but it does not turn this stage into a full template engine or custom editor.
Stage 22 adds a separate read-only descriptor visualization layer in `ProgramMatrixBuilder`.

## Stage 21 admin mutations

`SequenceService` now exposes narrow admin mutations for the program editor:
- `get_program_descriptor_copy(program_id)`
- `replace_program(program_id, new_descriptor, now_ms)`
- `remove_program(program_id, now_ms)`
- `set_program_enabled(program_id, enabled, now_ms)`

Safe behavior:
- replace is denied for active programs
- delete is denied for active programs
- disable is denied for active programs
- replace revalidates the full descriptor before commit
- failed replace and failed delete do not partially mutate the registered program set

Stage 10 adds a separate transport-neutral API facade in `firmware/components/api`.
That facade wraps the engine and documents future endpoint mapping in [docs/API.md](API.md), but it still does not add a real HTTP server.

## MVP Scope

Stage 9 supports:
- typed `SequenceProgram`, `SequenceState`, `SequenceTransition`, `SequenceAction`
- program registration and validation
- one active program at a time
- `start_program`, `request_normal_stop`, `request_trip_stop`, `reset_active_program`, `tick`
- `ConditionTree` for start/reset conditions, state guards and transitions
- `ActuatorManager` output ownership with `Sequence` priority
- `TimerService` command actions
- `AlarmService` command actions
- `SignalRegistry` publication
- read-only output-matrix generation from persistent state actions
- bounded in-memory history
- host-side tests

Stage 9 does not support:
- real HTTP API transport
- Web UI
- MQTT
- full template wizard or custom editor
- config-to-sequence adapter
- parallel multi-program execution
- advanced stepper or motor runtime logic
- persistence

## Model

### Program

`SequenceProgram` contains:
- `id`, `name`, `enabled`, `type`
- `initial_state_id`
- `normal_stop_state_id`
- `trip_state_id`
- `lockout_state_id`
- optional `start_condition`
- optional `reset_condition`
- ordered `states`

Program ids are sequence-native and independent from the Stage 1 config model.

### State

`SequenceState` contains:
- `id`, `name`, `enabled`, `type`
- ordered `entry_actions`
- ordered `active_actions`
- ordered `exit_actions`
- optional `guard_condition`
- optional `guard_fail_target_state_id`
- optional `min_time_ms`
- optional `max_time_ms`
- optional `timeout_target_state_id`
- ordered `transitions`
- `non_skippable`
- `manual_allowed`

### Transition

`SequenceTransition` contains:
- `id`
- `name`
- `target_state_id`
- optional `condition`
- `require_min_time_done`
- `enabled`

Transitions are evaluated in configured order.
The first eligible transition wins, but the engine still captures a full ordered candidate checklist for explanation.

### Actions

Stage 9 action support is intentionally narrow.

Persistent output actions:
- `relay_request`
- `pwm_request`

These are valid only in `active_actions`.

Stage 22 matrix semantics use this distinction directly:
- only `active_actions` produce matrix cells
- `entry_actions` and `exit_actions` appear in the state detail panel instead

Command actions:
- `timer_start`
- `timer_stop`
- `alarm_set_condition`
- `write_virtual_signal`
- `log_note`

These are valid in `entry_actions` and `exit_actions`.

Validation rejects unsupported action kinds in unsupported sections.

## Runtime Semantics

### One Active Program

Multiple programs may be registered, but only one may be active at a time.
Starting a second program while one is active returns a structured error.

### Start

`start_program()`:
- rejects missing or disabled programs
- rejects start while another program is active
- evaluates optional `start_condition`
- records `start_denied` history if start is rejected
- enters the initial state if start is allowed

### Entry / Active / Exit

When a state becomes active:
- entry actions run once
- the engine records `state_entered`
- state timing resets
- per-state guard and transition evaluators are created

While a state is active:
- active actions maintain persistent `ActuatorManager` requests
- the owner format is `program:<program_id>:state:<state_id>`
- the request priority is always `Sequence`

When a state exits:
- exit actions run once
- the engine records `state_exited`
- persistent actuator requests for that state owner are cleared

Inactive per-program signals are driven back to neutral values:
- empty strings for state ids and reasons
- `false` for flags
- `0` for elapsed time

The engine does not keep stale last-known runtime values published for inactive programs.

### Guards

If a state has a `guard_condition`, the engine evaluates it on every tick while the state is active.

If the effective guard result is false:
- the engine branches to `guard_fail_target_state_id` if configured
- otherwise it branches to the program `trip_state_id`
- a `guard_failed` history entry is recorded
- the last guard trace is kept in the snapshot

### Min / Max Time

`min_time_ms`:
- blocks transitions that set `require_min_time_done=true`
- does not block transitions that do not require it

`max_time_ms`:
- triggers an immediate timeout branch when elapsed time reaches the limit
- requires `timeout_target_state_id` during validation
- records a `timeout` history entry

### Transition Evaluation

Each tick builds an ordered transition checklist with:
- transition id
- target state id
- eligible yes/no
- reason
- min-time satisfied flag
- optional condition effective result
- optional condition trace

This checklist is exposed in `SequenceSnapshot`.

### Normal Stop / Trip

`request_normal_stop()`:
- records `normal_stop_requested`
- sets a pending stop flag
- on the next tick branches to `normal_stop_state_id` before normal transitions

`request_trip_stop()`:
- records `trip_requested`
- sets a pending trip flag
- on the next tick branches to `trip_state_id` before normal transitions

Trip takes precedence over normal stop.

### Lockout / Reset

When the current state is the configured lockout state:
- lifecycle becomes `lockout`
- `start_program()` returns `SEQUENCE_LOCKOUT_ACTIVE`

`reset_active_program()` is allowed only when:
- an active program exists
- the current state is the lockout state
- optional `reset_condition` evaluates true

Successful reset:
- clears pending stop/trip flags
- clears state-owned actuator requests
- records `reset`
- returns the runtime to idle

Rejected reset:
- records `reset_denied`
- preserves lockout

## Integrations

### ConditionTree

Sequence uses `ConditionTree` for:
- program start condition
- program reset condition
- state guard condition
- transition condition

### ActuatorManager

All persistent output actions are routed through `ActuatorManager`.
Sequence never drives outputs directly.

Every output request includes:
- priority `Sequence`
- owner `program:<program_id>:state:<state_id>`
- human-readable reason text

### TimerService

Stage 9 supports:
- `timer_start`
- `timer_stop`

These are command actions only.

### AlarmService

Stage 9 supports explicit `alarm_set_condition` actions only.
Automatic trip enforcement from aggregate alarm status is postponed.

### SignalRegistry

Global signals:
- `program.active`
- `program.active_id`
- `program.lifecycle`

Per-program signals:
- `program.<id>.current_state`
- `program.<id>.previous_state`
- `program.<id>.state_elapsed_ms`
- `program.<id>.pending_normal_stop`
- `program.<id>.pending_trip`
- `program.<id>.lockout`
- `program.<id>.can_start`
- `program.<id>.can_reset`
- `program.<id>.last_reason`
- `program.<id>.current_state_type`

## History And Snapshots

`SequenceHistoryBuffer` stores bounded in-memory history with drop-oldest behavior.
Clearing history removes entries but does not promise sequence-number reuse.

`SequenceSnapshot` exposes:
- active program id
- lifecycle
- current and previous state ids
- current state type
- elapsed time
- pending stop/trip flags
- lockout
- can-start / can-reset
- last reason
- transition checklist
- last guard trace
- update counter
- history size

Stage 10 builds `SequenceApiService` on top of these snapshots and history entries rather than duplicating runtime business logic.
