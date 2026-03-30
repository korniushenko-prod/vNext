# EventCounter reference slice v1

## Purpose

`EventCounter` is the Wave 3 counter object for discrete events and pulses.

It gives the platform a reusable accumulated count primitive that can later feed
maintenance logic, alarming, and templates without embedding counting logic in
domain packages.

## Public ports

Inputs:

- `event_in`

Outputs:

- `count_out`
- `event_seen`
- `source_ok`

## Parameters

- `edge_mode`
- `debounce_ms`
- `persist_enabled`
- `persist_period_s`
- `increment_step`

## Operations

- `reset_counter`

## Monitoring / persistence

Trace groups:

- `counting`

Monitors:

- `stale_source`
- `unexpected_event_rate`

Persistence:

- accumulated count

Presets:

- `pulse_counting`
- `cycle_counting`

## Files in this slice

- `event-counter.object-type.json` - canonical library object contract
- `event-counter.project.minimal.json` - minimal project using the object
- `event-counter.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `event-counter.shipcontroller-artifact.json` - canonical ShipController artifact snapshot
