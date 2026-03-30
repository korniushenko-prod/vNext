# RunHoursCounter reference slice v1

## Purpose

`RunHoursCounter` is the first Wave 3 monitoring / maintenance object.

It proves that the platform can treat accumulated service data as a first-class
library object instead of burying it inside domain-specific runtime code.

## Public ports

Inputs:

- `active_in`

Outputs:

- `running_out`
- `total_hours`
- `total_seconds`
- `source_ok`

## Parameters

- `persist_enabled`
- `persist_period_s`
- `rounding_mode`
- `min_active_time_ms`

## Operations

- `reset_counter`

The canonical ShipController artifact now preserves this reset operation on the
Wave 8 execution baseline.
It stays synthetic and offline-only, but the artifact marks `reset_counter` as
`execution_baseline: true` with frozen confirmation token, cancel, progress,
result, and audit summary metadata.
This behavior is additive-only beyond bugfixes and does not add real execution
handlers or device callbacks.

## Monitoring / persistence

Trace groups:

- `runtime`

Monitors:

- `stale_source`
- `unexpected_toggle_rate`

Persistence:

- total accumulated runtime

Presets:

- `default_runtime_hours`
- `maintenance_runtime`

## Files in this slice

- `run-hours-counter.object-type.json` - canonical library object contract
- `run-hours-counter.project.minimal.json` - minimal project using the object
- `run-hours-counter.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `run-hours-counter.shipcontroller-artifact.json` - canonical ShipController artifact snapshot
