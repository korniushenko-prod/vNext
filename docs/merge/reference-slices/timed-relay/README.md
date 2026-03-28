# TimedRelay reference slice v1

## Purpose

`TimedRelay` is the first reference vertical slice for `vNext`.

It is intentionally small, but it forces the platform to prove five things:

1. a standard library object can exist as a first-class `ObjectType`;
2. a simple mechanism can be configured through a friendly component face;
3. `materializer-core` can produce a deterministic `RuntimePack`;
4. the ESP32 target adapter can emit a deterministic ShipController artifact;
5. the architecture remains the same later for `Flowmeter`, `PID`, and `BoilerSupervisor`.

## Architectural position

`TimedRelay` is a **library leaf object**.

It is **not** authored through `Composition / State / Flow` in v1.
It uses a **native seam** and exposes a simple user-facing face.

That is deliberate.

The platform principle is:

- simple things should be easy to instantiate and configure;
- complex things may open into deeper engineering surfaces;
- both simple and complex things remain `ObjectType`s.

## Object contract

External behavior:

- when `trigger_cmd` becomes true, the relay starts a pulse;
- `relay_out` becomes active for `pulse_time_ms`;
- `active_fb` reports that the pulse is active;
- `remaining_ms` reports the remaining pulse time;
- `reset_cmd` aborts the pulse;
- if `require_enable = true`, `enable_in` must be true to start a pulse;
- if `retriggerable = true`, a new trigger restarts the pulse.

This is enough to cover the example:

> button turns relay on and it turns off after 5 seconds.

## Why this is the correct first slice

`TimedRelay` is small, but it exercises the exact seams we need:

- authoring schema
- library object contract
- param metadata
- operations
- debug traces
- simulation hook
- materialization
- target compatibility
- deterministic target artifact

## What is intentionally *not* included

Not included in v1:

- custom Flow/State authoring
- complex alarm model
- communication bridge logic
- commissioning wizard
- live deploy transport
- runtime execution engine merge

Those come later.

## Files in this package

- `timed-relay.object-type.json` — canonical library object contract
- `timed-relay.project.minimal.json` — minimal project using the object
- `timed-relay.runtime-pack.snapshot.json` — materialized target-neutral runtime pack snapshot
- `timed-relay.shipcontroller.artifact.snapshot.json` — deterministic offline target artifact snapshot

## Decision

`TimedRelay` is the **mandatory first end-to-end slice**.

Nothing larger should be attempted before this slice passes:

`ProjectModel -> materializer-core -> RuntimePack -> esp32-target-adapter -> ShipController artifact`
