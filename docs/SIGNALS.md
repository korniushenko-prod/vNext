# SignalRegistry

## Purpose

SignalRegistry is the common runtime data layer for the controller.

Future modules publish values into the registry and consume values from the registry instead of coupling directly to each other.

Examples of signal paths:
- `di1.raw`
- `di1.active`
- `ai1.pressure_bar`
- `relay1.state`
- `flow1.rate_l_min`
- `flow1.total_l`
- `pid1.output_percent`
- `program1.current_state`
- `alarm.trip_active`

Stage 4 provides only the typed registry model, descriptors, runtime state, stale detection and host-side tests.

Stage 4 does not implement:
- ActuatorManager
- rules or logic execution
- sequence runtime
- flowmeter runtime
- PID runtime
- API, Web UI or MQTT
- ESP-IDF integration

## Descriptor And Runtime State

`SignalDescriptor` describes what a signal is:
- stable `path`
- human-readable `name`
- `description`
- declared `type`
- optional `unit`
- `source_module`
- `access_mode`
- optional `max_age_ms`
- simple `enabled` and `visible` flags

Runtime state is stored separately and tracks:
- current typed value
- `initialized`
- `valid`
- `fault`
- `last_update_ms`
- `update_counter`

This separation keeps metadata stable while runtime values change over time.

## Supported Types

Stage 4 supports typed values through `std::variant`:
- `bool`
- `std::int64_t`
- `double`
- `std::string`

The registry does not use string-only values and does not serialize values to JSON in this stage.

## Access Modes

Supported access modes:
- `read_only`
- `writable_virtual`

Use them like this:
- `update_signal()` is the publisher path for runtime modules and test publishers
- `write_virtual_signal()` is the explicit write path for registry-owned writable virtual signals

`write_virtual_signal()` rejects `read_only` signals.

## Read And Snapshot Model

Reads return structured data instead of raw values only.

`SignalSnapshot` includes:
- descriptor metadata
- current value
- `valid`
- `fault`
- `stale`
- `initialized`
- `last_update_ms`
- `update_counter`

Typed helpers are available for direct reads:
- `read_bool()`
- `read_int64()`
- `read_double()`
- `read_string()`

If a caller requests the wrong type, the registry returns `SIGNAL_TYPE_MISMATCH`.

If a caller reads an uninitialized signal, the registry returns `SIGNAL_NOT_INITIALIZED`.

## Stale, Valid And Fault

The three quality flags are separate on purpose:

- `valid=false` means the published value is not trustworthy
- `fault=true` means the source or module reports a fault condition
- `stale=true` means the value age exceeded `max_age_ms`

Important Stage 4 rule:
- stale does not automatically force `valid=false`

Callers receive all three flags and can decide how to react.

## Deterministic Stale Calculation

Staleness is computed at read time from:
- stored `last_update_ms`
- descriptor `max_age_ms`
- caller-supplied `now_ms`

Rules:
- `max_age_ms == 0` disables stale detection
- a value becomes stale when its age is greater than `max_age_ms`
- no hidden wall clock is used

This keeps stale behavior deterministic and easy to test host-side.

## Structured Errors

Stage 4 uses stable structured error codes:
- `SIGNAL_ALREADY_REGISTERED`
- `SIGNAL_NOT_FOUND`
- `SIGNAL_TYPE_MISMATCH`
- `SIGNAL_WRITE_DENIED`
- `SIGNAL_NOT_INITIALIZED`
- `SIGNAL_INVALID_DESCRIPTOR`
- `SIGNAL_INVALID_PATH`

This keeps callers explicit about failure handling and avoids stringly-typed control flow.

## Deterministic Ordering

Signal registration order is preserved.

The following APIs return signals in registration order:
- `list_descriptors()`
- `list_signal_paths()`
- `list_signal_snapshots()`

## Host-Side Testability

`SignalRegistry` is an ordinary object, not a singleton and not a hidden global.

That makes it straightforward to use in host-side tests with fake `now_ms` values and without hardware or ESP-IDF dependencies.
