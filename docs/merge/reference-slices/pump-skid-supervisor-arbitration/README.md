# PumpSkidSupervisorArbitration v1

## Purpose

`PumpSkidSupervisorArbitration v1` is the mandatory non-boiler acceptance
slice for Wave 17 package command arbitration baseline.

It proves that the same ownership and arbitration vocabulary works on a second
domain without leaking boiler-shaped semantics, safety assumptions, or
vendor-specific command workflows into shared package layers.

## Scope

Included here:

- non-boiler reference package arbitration contract
- ownership lane definitions and ownership summary metadata
- command lanes and command summary metadata
- summary outputs, aggregate monitor, and trace group
- self-contained project-local member object type

Intentionally excluded:

- skid-specific imperative runtime
- safety workflows
- package-local execution engines

## Canonical Rules

- package arbitration remains generic, package-neutral, and bounded
- pump-skid domain is the mandatory second acceptance domain
- denied, blocked, and superseded outcomes remain explicit
- package command requests stay metadata-first and do not become a hidden engine

## Files In This Slice

- `pump-skid-supervisor-arbitration.package-definition.json` - canonical
  non-boiler package arbitration contract
- `pump-skid-supervisor-arbitration.project.minimal.json` - minimal
  self-contained project instantiating the package
- `pump-skid-supervisor-arbitration.project.e2e.json` - canonical end-to-end
  project for the arbitration slice
- `pump-skid-supervisor-arbitration.runtime-pack.snapshot.json` - canonical
  flattened runtime output for the slice
- `pump-skid-supervisor-arbitration.shipcontroller-artifact.json` - deterministic
  ESP32 ShipController artifact for the slice
- `pump-skid-supervisor-arbitration.package-overview.fixture.json` - canonical
  config-studio read-only package overview fixture

## End-To-End Gate

The accepted Wave 17 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_arbitration -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`
