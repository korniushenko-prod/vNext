# PumpSkidSupervisor v1

## Purpose

`PumpSkidSupervisor v1` is the first product-track pilot package. It combines
the previously frozen package-neutral layers into one bounded production-like
pump-skid node with real bench bindings, deploy/apply/readback baseline, and a
commissioning-facing UI surface.

## Scope

Included here:

- pilot package contract over frozen package layers
- real bench-oriented child I/O members
- package templates and presets
- bounded modes: `off`, `auto`, `manual`
- bounded package operations and package summaries
- deterministic runtime pack
- deterministic ShipController artifact
- deterministic readback snapshot
- deterministic package overview fixture
- deterministic commissioning fixture

Intentionally excluded:

- fleet orchestration
- remote write over communications
- vendor-specific integrations
- safety runtime

## Files In This Slice

- `pump-skid-supervisor.package-definition.json`
- `pump-skid-supervisor.project.minimal.json`
- `pump-skid-supervisor.project.pilot.json`
- `pump-skid-supervisor.project.e2e.json`
- `pump-skid-supervisor.runtime-pack.snapshot.json`
- `pump-skid-supervisor.shipcontroller-artifact.json`
- `pump-skid-supervisor.readback.snapshot.json`
- `pump-skid-supervisor.package-overview.fixture.json`
- `pump-skid-supervisor.commissioning.fixture.json`

## End-To-End Path

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> apply/deploy/readback -> config-studio commissioning surface`

## Freeze Note

This slice starts the first product/pilot track. It must stay bounded to
`PumpSkidSupervisor v1` and must not reopen frozen generic platform waves by
default.
