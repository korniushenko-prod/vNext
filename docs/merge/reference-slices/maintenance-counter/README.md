# MaintenanceCounter reference slice v1

## Purpose

`MaintenanceCounter` is the Wave 3 service object that turns accumulated usage
into due / overdue maintenance states.

It is intentionally separate from `RunHoursCounter` and `EventCounter` so that
usage accumulation and service policy remain reusable and composable.

It is a downstream monitoring object: `usage_total_in` is an upstream runtime
value, not a frontend/acquisition binding.

## Public ports

Inputs:

- `usage_total_in`

Outputs:

- `remaining_out`
- `due_out`
- `overdue_out`
- `progress_out`
- `source_ok`

## Parameters

- `service_interval`
- `warning_before`
- `overdue_margin`
- `auto_rollover`
- `persist_enabled`

## Operations

- `acknowledge_due`
- `reset_interval`

The offline target artifact now splits these operations cleanly across the
frozen baselines:

- `acknowledge_due` remains metadata-only;
- `reset_interval` is marked as `execution_baseline: true`.

That execution lane stays synthetic and offline-only while preserving stable
ids, confirmation token, cancel, progress, result, and audit summary metadata.
This behavior is additive-only beyond bugfixes.

## Monitoring / persistence

Trace groups:

- `maintenance`

Monitors:

- `stale_source`
- `interval_invalid`

Persistence:

- last reset baseline
- acknowledge state

Presets:

- `hours_based_service`
- `cycles_based_service`

## Files in this slice

- `maintenance-counter.object-type.json` - canonical library object contract
- `maintenance-counter.project.minimal.json` - minimal project using the object
- `maintenance-counter.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `maintenance-counter.shipcontroller-artifact.json` - canonical ShipController artifact snapshot
