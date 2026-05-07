# FlowService

## Purpose

`FlowService` is the Stage 14 runtime module for pulse-based flow measurement and totalizing.

It converts `PulseInputHal` counts into:
- raw lifetime pulse count
- lifetime volume total
- trip total
- batch total
- instantaneous/published rate
- no-flow and high-flow status
- bounded trend data
- bounded runtime history/events

It does not control outputs.
It only measures, stores and publishes runtime state.

## Descriptor vs runtime state

`FlowDescriptor` is the typed configuration model.
It defines the pulse source, engineering unit, k-factor, primary rate mode, save policy, status thresholds and trend sizing.

`RuntimeFlowState` is the deterministic runtime state derived from:
- stored protected totals
- current HAL pulse count
- explicit caller-supplied `now_ms`

The service keeps descriptor and runtime state separate on purpose.

## Pulse counting semantics

`PulseInputHal` is treated as a monotonically increasing counter since backend start.

On each `tick(now_ms)`:
- `current_count = PulseInputHal::get_count(pulse_input_id)`
- if `current_count >= last_hal_count`, then `delta_pulses = current_count - last_hal_count`
- if `current_count < last_hal_count`, the source counter is treated as restarted/reset
- on reset/restart, `delta_pulses = current_count` and a `pulse_source_reset_detected` history event is recorded
- `raw_pulse_lifetime += delta_pulses`
- `lifetime_total_units += delta_pulses / k_factor_pulses_per_unit`

The service never crashes on a source counter restart.

## Protected lifetime totals

Stage 14 stores two lifetime protected totals through `StorageService`:
- `flow.<id>.raw_pulse_lifetime`
- `flow.<id>.lifetime_total`

Initialization behavior:
- `initialize_from_storage(now_ms)` reads both totalizers for every registered flowmeter
- missing records are treated as zero
- invalid/corrupt records surface `FLOW_STORAGE_READ_FAILED`

Persistence behavior:
- save is triggered by `save_every_pulses`
- save is triggered by `save_every_ms`
- if neither save policy is configured, Stage 14 saves on the next tick that carries pulse delta

Protected lifetime totals rely on `StorageService` semantics, so they survive normal reset and factory reset the same way other protected totalizers do.

## Rate calculation modes

Stage 14 calculates and publishes all three rate modes on every tick:

### `time_window`

Uses recent pulse deltas accumulated inside `time_window_ms`.

Formula:
- `units_per_min = pulses_in_window / k_factor * 60000 / time_window_ms`

### `pulse_frequency`

Uses `PulseInputHal::get_frequency_hz()` when available.

Formula:
- `units_per_min = frequency_hz / k_factor * 60`

If frequency is unavailable or invalid, Stage 14 publishes `0` for this mode and keeps the service alive.

### `avg_last_n_pulses`

Uses the time span across the stored timestamps for the last `N` pulses.

Stage 14 computes this as:
- `units_per_min = (N - 1) / k_factor * 60000 / elapsed_ms_between_oldest_and_newest`

Behavior notes:
- fewer than `N` pulses -> publish `0`
- `N <= 1` or zero elapsed time -> publish `0`

### Published primary rate

`current_rate_units_per_min` is selected from the configured `primary_rate_mode`.

The individual mode outputs are also published separately:
- `rate_time_window`
- `rate_pulse_frequency`
- `rate_avg_n`

## Batch semantics

Stage 14 batch support is measurement-only.
It does not actuate hardware on completion.

Supported operations:
- `start_batch(...)`
- `stop_batch(...)`
- `reset_trip_total(...)`
- `reset_batch_total(...)`

Batch behavior:
- starting a batch resets `batch_total_units` to zero
- target comes from the override argument or `batch_target_default`
- while active, flow volume is added to `batch_total_units`
- when `batch_total_units >= target`, the batch auto-completes, `batch_done=true`, `batch_active=false`, and `batch_completed` is recorded
- stopping a batch does not clear the total
- resetting trip or batch totals never affects protected lifetime totals

## No-flow and high-flow semantics

### No-flow

If `no_flow_timeout_ms` is configured:
- `last_pulse_age_ms = now_ms - last_pulse_seen_ms`
- `no_flow = last_pulse_age_ms >= no_flow_timeout_ms`

If no pulses have ever been seen after initialization, Stage 14 measures the timeout from service initialization time.

### High-flow

If `high_flow_threshold` is configured:
- `high_flow = current_rate_units_per_min > high_flow_threshold`

If no threshold is configured:
- `high_flow = false`

## Trend buffer

Stage 14 includes a deterministic bounded ring buffer per flowmeter.

Descriptor controls:
- `trend_bucket_ms`
- `trend_bucket_count`

Each bucket stores:
- `bucket_start_ms`
- `volume_delta_units`
- `average_rate_units_per_min`

Ordering returned by `read_trend(id)`:
- oldest-to-newest

Persistence:
- none in Stage 14

## SignalRegistry publication

Per-flow signals published by Stage 14:
- `flow.<id>.raw_pulse_lifetime`
- `flow.<id>.lifetime_total`
- `flow.<id>.trip_total`
- `flow.<id>.batch_total`
- `flow.<id>.batch_active`
- `flow.<id>.batch_done`
- `flow.<id>.batch_target`
- `flow.<id>.rate`
- `flow.<id>.rate_time_window`
- `flow.<id>.rate_pulse_frequency`
- `flow.<id>.rate_avg_n`
- `flow.<id>.no_flow`
- `flow.<id>.high_flow`
- `flow.<id>.last_pulse_age_ms`

Representation choice:
- `raw_pulse_lifetime` is always published as `string`

That keeps the signal path stable even when the runtime `uint64` exceeds signed numeric signal range.

Signal publish failures surface `FLOW_SIGNAL_PUBLISH_FAILED`.

## Stage 15 UI layer

Stage 15 adds the first runtime-facing Flow UI contract above `FlowService`:
- `FlowApiService`
- `WebFlowAdapter`
- static assets in `webui/flow`

This UI layer is intentionally runtime-only:
- flow list and detail
- status badges
- trend and recent history
- batch runtime controls
- read-only descriptor summary

Runtime editing of `FlowDescriptor` is still postponed.

## Postponed beyond Stage 15

Still intentionally postponed:
- HTTP API or MQTT bindings
- density or temperature correction
- reverse flow
- commercial metering features
- Modbus
- direct output control on batch completion
- persistence beyond protected lifetime totals
- real ESP32 FRAM/NVS storage backend
