# Logic Engine

## Purpose

Stage 12 adds `LogicService` as the shared runtime for background rules that do not need a full step-by-step process program.

Typical examples:
- if pressure is low, request a pump output
- if flow disappears, raise an alarm condition
- if a service flag is active, start a program
- if a cabinet is hot, request a fan output
- if a maintenance threshold is reached, publish a warning signal

Sequence remains the engine for ordered process steps.
Logic is the engine for background conditions and support behavior.

## Model

Each rule uses a typed `RuleDescriptor` with:
- `id`
- `name`
- `enabled`
- optional `description`
- `condition_tree`
- `on_true_actions`
- `while_true_actions`
- `on_false_actions`
- optional `source_module`, `visible` and `tags`

Rule ids must be unique and must be safe for stable signal publication under `rule.<id>.*`.
Registration order is preserved and is the deterministic Logic Engine evaluation order.

## Semantics

Each `tick(now_ms)` evaluates enabled rules in registration order.

When a rule changes `false -> true`:
- the rule becomes active
- `activation_count` increments
- `on_true_actions` run once in configured order
- `while_true_actions` begin maintaining persistent output ownership

While a rule stays true:
- `on_true_actions` do not re-run
- `while_true_actions` submit persistent `ActuatorManager` requests every tick
- persistent output failures are recorded, but later output actions in the same section still run

When a rule changes `true -> false`:
- Logic clears that rule owner from `ActuatorManager`
- `on_false_actions` run once in configured order
- the rule becomes inactive

When a rule is disabled:
- it is not evaluated
- active persistent requests owned by that rule are cleared
- the active state resets without firing `on_false_actions`

## Narrow Admin Mutations

Stage 13 adds narrow admin methods for the Rules UI:
- `replace_rule(rule_id, new_descriptor, now_ms)`
- `remove_rule(rule_id, now_ms)`
- `set_rule_enabled(rule_id, enabled, now_ms)`

These methods intentionally stay narrow and only support safe editing semantics.

### Replace

`replace_rule(...)`:
- validates the replacement descriptor before mutation
- requires the replacement descriptor id to match the existing rule id
- clears persistent requests owned by the active rule before the replacement is installed
- resets that rule runtime state before the replacement is evaluated on a later tick

### Remove

`remove_rule(...)`:
- clears persistent requests owned by the rule
- removes the rule from deterministic evaluation order
- clears published per-rule runtime values

### Enable / Disable

`set_rule_enabled(..., false, now_ms)`:
- clears persistent requests owned by the rule
- resets runtime state
- does not execute `on_false_actions`

`set_rule_enabled(..., true, now_ms)`:
- reenables future evaluation
- does not auto-fire until the next normal tick

## Actions

Supported `while_true` output actions:
- `relay_request`
- `pwm_request`

Supported `on_true` / `on_false` command actions:
- `timer_start`
- `timer_stop`
- `alarm_set_condition`
- `write_virtual_signal`
- `program_start`
- `program_request_normal_stop`
- `program_request_trip`
- `program_reset_active`
- `log_note`

Validator rules:
- output actions are only allowed in `while_true_actions`
- command actions are not allowed in `while_true_actions`
- unknown actuator, timer, alarm, program or virtual signal references are rejected before registration

Command actions execute in configured order and stop on the first failure in that section.
The failure is recorded in rule state and history, and later actions in the same section are skipped.

## Integrations

### ConditionTree

Each rule owns its own `ConditionEvaluator` instance.
Evaluation errors are handled deterministically:
- the error is recorded in rule state and history
- the effective condition is treated as false
- active persistent outputs are cleared on the resulting transition to inactive

### ActuatorManager

Logic never drives outputs directly.
`while_true` output requests go through `ActuatorManager` with:
- priority `AutoRule`
- owner `rule:<rule_id>`
- human-readable reason text

Logic does not arbitrate output conflicts itself.
It only submits requests in deterministic order; final ownership resolution stays in `ActuatorManager`.

### TimerService

`timer_start(timer_id)` and `timer_stop(timer_id)` are delegated directly to `TimerService`.

### AlarmService

`alarm_set_condition(alarm_id, bool active)` delegates to `AlarmService::set_condition(...)` with rule-based source and reason strings.

### SignalRegistry

Logic publishes global signals:
- `rule.any_active`
- `rule.active_count`

Logic publishes per-rule signals:
- `rule.<id>.enabled`
- `rule.<id>.active`
- `rule.<id>.activation_count`
- `rule.<id>.last_reason`
- `rule.<id>.last_transition_ms`
- `rule.<id>.last_error`

Logic also supports `write_virtual_signal(path, value)` for writable virtual signals only.

### SequenceService

Program actions delegate to `SequenceService`:
- `program_start(program_id)`
- `program_request_normal_stop()`
- `program_request_trip()`
- `program_reset_active()`

## Snapshots And History

`RuleSnapshot` exposes current status, activation counters, last reason/error, last transition time and last condition trace.

History is an in-memory bounded ring buffer with deterministic drop-oldest behavior.
Entries include:
- sequence number
- rule id
- event type
- timestamp
- source
- reason

Supported event types include:
- `rule_became_true`
- `rule_became_false`
- `output_request_failed`
- `command_executed`
- `command_failed`
- `evaluation_error`
- `rule_disabled_cleared`

## Postponed

This stage intentionally postpones:
- generic rule persistence
- real HTTP API routing/binding
- Web UI bindings
- MQTT
- schedules/calendar logic
- textual rule parser/import
- persistence of rules/history
- advanced mode-management policies
