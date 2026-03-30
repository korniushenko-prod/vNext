## Purpose

`RunHoursCounter -> MaintenanceCounter` is the canonical combined Wave 3 slice.

It proves that accumulated usage can flow through the normal runtime connection
graph from an upstream counter into a downstream maintenance policy object
without any fake frontend binding or hidden accumulation logic.

`MaintenanceCounter` stays a downstream monitoring object here:
`usage_total_in` consumes the upstream `total_hours` runtime output from
`RunHoursCounter` and does not create its own acquisition/frontend requirement.

## Public flow

`motor_status_1.value`
-> `run_hours_1.active_in`
-> `run_hours_1.total_hours`
-> `maintenance_counter_1.usage_total_in`

## What this slice proves

- `RunHoursCounter` still requires a real frontend binding for `active_in`
- `MaintenanceCounter` consumes upstream accumulated usage as a normal runtime input
- the combined path closes cleanly through `ProjectModel -> RuntimePack -> compatibility -> ShipController artifact`
- the frozen Wave 8 execution baseline marks `reset_counter` and `reset_interval`
  as runnable synthetic reset operations while `acknowledge_due` stays
  metadata-only

## Files in this slice

- `run-hours-to-maintenance.project.json` - canonical combined project
- `run-hours-to-maintenance.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `run-hours-to-maintenance.shipcontroller-artifact.json` - canonical ShipController artifact snapshot
