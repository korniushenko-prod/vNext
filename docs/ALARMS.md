# AlarmService

## Purpose

Stage 7 introduces `AlarmService` as the shared runtime alarm layer for future:
- Rules
- Sequence Engine
- Flowmeter
- PID guards
- service and test modes
- UI, API and MQTT read models

`AlarmService` does not evaluate conditions in this stage.

External modules report only:
- alarm `condition_active=true`
- alarm `condition_active=false`

`AlarmService` then owns:
- effective `active` state
- latching behavior
- reset rules
- aggregate severity status
- SignalRegistry publication
- in-memory alarm history

`AlarmService` is a normal object, not a singleton.

## Model

The alarm component separates:
- `AlarmDescriptor`: static metadata and configuration
- `RuntimeAlarmState`: mutable runtime state
- `AlarmSnapshot`: read-facing per-alarm snapshot
- `AggregateAlarmStatus`: shared system-level alarm summary
- `AlarmHistoryEntry`: ordered event history

Descriptors are registered in deterministic order and are listed in that same order.
If multiple active alarms share the same severity, aggregate `highest_severity_alarm_id` resolves to the first active alarm in registration order.

## Severity Ordering

Supported severities:
- `info`
- `warning`
- `inhibit`
- `trip`
- `safety`

Explicit ordering:
- `safety > trip > inhibit > warning > info`

Aggregate `highest_severity` always reflects the most severe currently active alarm.
When no alarms are active, `highest_severity` is empty and the published `alarm.highest_severity` signal is an empty string.

## Descriptor

`AlarmDescriptor` includes:
- `id`
- `name`
- `enabled`
- `severity`
- `latching`
- `description`
- `source_module`
- `publish_signals`
- `visible`
- `auto_acknowledge`
- `history_enabled`

Descriptor rules in Stage 7:
- `id` must be non-empty
- `name` must be non-empty
- severity must be supported
- duplicate ids are rejected
- `id` must be a valid dot-separated identifier because it is reused in signal paths

Acknowledgement is intentionally postponed in this stage.
The `acknowledged` runtime field exists for forward compatibility and remains `false`.

## Runtime State

`RuntimeAlarmState` tracks:
- `initialized`
- `condition_active`
- `active`
- `latched`
- `acknowledged`
- `reset_allowed`
- `first_activated_ms`
- `last_changed_ms`
- `activation_count`
- `update_counter`
- `last_source`
- `last_reason`

Stage 7 semantics:
- `condition_active` stores the latest externally reported condition state
- `active` is the effective state visible to the rest of the system
- `latched` indicates that the alarm is holding active state until reset
- `reset_allowed` is true only for latching alarms that are still active while `condition_active == false`
- `first_activated_ms` is the start timestamp of the current active episode and resets to `0` when the alarm becomes inactive
- `activation_count` increments only on `inactive -> active`
- `last_source` and `last_reason` update only on state-changing operations
- repeated no-op operations do not change `update_counter`

## Non-Latching Semantics

For `latching=false`:
- `condition_active=true` makes `active=true`
- while the condition stays true, the alarm stays active
- `condition_active=false` makes `active=false`
- `latched` is always false
- `reset_alarm()` is a success no-op and does not clear an active condition

## Latching Semantics

For `latching=true`:
- `condition_active=true` makes `active=true` and `latched=true`
- while the condition stays true, reset is denied
- `condition_active=false` clears only the raw condition
- after the condition clears, `active` remains true until `reset_alarm()`
- `reset_alarm()` succeeds only when `condition_active == false`
- after a successful reset, `active=false` and `latched=false`
- if the condition becomes active again later, the alarm latches again and `activation_count` increments only if the alarm was inactive before that raise

Repeated `set_condition()` with the same effective state is idempotent:
- no state change
- no counter increment
- no history entry

## Aggregate Status

`AggregateAlarmStatus` includes:
- `any_active`
- `info_active`
- `warning_active`
- `inhibit_active`
- `trip_active`
- `safety_active`
- `active_count`
- `highest_severity`
- `highest_severity_alarm_id`
- `update_counter`

Aggregate rules:
- `any_active` is true when any alarm is effectively active
- `trip_active` is true when any active trip alarm exists
- `safety_active` is true when any active safety alarm exists
- `update_counter` increments only when the aggregate snapshot itself changes

## SignalRegistry Publication

When `AlarmService` is constructed with a `SignalRegistry`, it publishes stable `alarm.` paths.

Aggregate signals:
- `alarm.any_active`
- `alarm.info_active`
- `alarm.warning_active`
- `alarm.inhibit_active`
- `alarm.trip_active`
- `alarm.safety_active`
- `alarm.active_count`
- `alarm.highest_severity`

Per-alarm signals:
- `alarm.<id>.condition_active`
- `alarm.<id>.active`
- `alarm.<id>.latched`
- `alarm.<id>.reset_allowed`
- `alarm.<id>.severity`
- `alarm.<id>.activation_count`
- `alarm.<id>.last_reason`

Publication rules:
- aggregate signals are always published when a registry is attached
- per-alarm publication follows descriptor `publish_signals`
- signal publication is deterministic
- publication failures return structured `ALARM_SIGNAL_PUBLISH_FAILED` errors instead of crashing
- severity values are published as lowercase strings such as `trip` and `safety`

## History

Stage 7 includes a lightweight in-memory history buffer.

Each `AlarmHistoryEntry` includes:
- `sequence_number`
- `alarm_id`
- `event_type`
- `severity`
- `timestamp_ms`
- `source`
- `reason`

Supported event types:
- `condition_raised`
- `condition_cleared`
- `latched`
- `reset`
- `reset_denied`

History policy:
- history is bounded by constructor `history_capacity`
- when full, the oldest entry is dropped
- event ordering is deterministic
- `clear_history()` removes stored entries but does not reset the monotonic `sequence_number`

## Structured Results

Stage 7 uses structured status/result objects rather than plain `bool`.

Important error codes:
- `ALARM_ALREADY_REGISTERED`
- `ALARM_NOT_FOUND`
- `ALARM_INVALID_DESCRIPTOR`
- `ALARM_INVALID_SEVERITY`
- `ALARM_RESET_DENIED`
- `ALARM_SIGNAL_PUBLISH_FAILED`
- `ALARM_OPERATION_UNSUPPORTED`

## Postponed

Stage 7 intentionally does not implement:
- ConditionTree evaluation
- automatic alarm rules evaluation
- Rules integration
- Sequence Engine integration
- Flowmeter integration
- PID integration
- ActuatorManager trip enforcement
- HTTP API
- Web UI
- MQTT
- persistence of alarm history
- acknowledgement workflows
