# ThresholdMonitor reference slice v1

## Purpose

`ThresholdMonitor` is the Wave 3 monitoring object for numeric limit and window
checks.

It gives the platform a reusable alarm/condition primitive that can be reused by
control, monitoring, maintenance, and future communications-based slices.

## Public ports

Inputs:

- `value_in`

Outputs:

- `above_out`
- `below_out`
- `in_window_out`
- `alarm_active`
- `source_ok`

## Parameters

- `mode`
- `threshold_a`
- `threshold_b`
- `hysteresis`
- `latch_alarm`
- `timeout_ms`

## Operations

- `reset_latch`

## Monitoring

Trace groups:

- `thresholds`

Monitors:

- `stale_source`
- `value_missing`

Presets:

- `high_limit`
- `low_limit`
- `window_limit`

## Files in this slice

- `threshold-monitor.object-type.json` - canonical library object contract
- `threshold-monitor.project.minimal.json` - minimal project using the object
- `threshold-monitor.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `threshold-monitor.shipcontroller-artifact.json` - canonical ShipController artifact snapshot
