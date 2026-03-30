# BoilerSupervisorArbitration v1

## Purpose

`BoilerSupervisorArbitration v1` is the boiler-like acceptance slice for Wave
17 package command arbitration baseline.

It proves that package-level command requests, ownership lanes, and explicit
accepted/blocked/denied/superseded outcomes can be expressed as package-neutral
metadata without opening package execution runtime, workflow engines, or
boiler-specific shared semantics.

## Scope

Included here:

- boiler-like reference package arbitration contract
- ownership lane definitions and ownership summary metadata
- command lanes and command summary metadata
- summary outputs, aggregate monitor, and trace group
- self-contained project-local member object type

Intentionally excluded:

- package-local imperative command execution
- boiler-specific workflow logic
- safety or vendor-specific semantics

## Canonical Rules

- package arbitration remains generic, package-neutral, and bounded
- boiler-like content is reference-only and non-privileged
- denied, blocked, and superseded outcomes remain explicit
- package command requests stay metadata-first and do not become a hidden engine

## Files In This Slice

- `boiler-supervisor-arbitration.package-definition.json` - canonical
  boiler-like package arbitration contract
- `boiler-supervisor-arbitration.project.minimal.json` - minimal self-contained
  project instantiating the package
- `boiler-supervisor-arbitration.project.e2e.json` - canonical end-to-end
  project for the arbitration slice
- `boiler-supervisor-arbitration.runtime-pack.snapshot.json` - canonical
  flattened runtime output for the slice
- `boiler-supervisor-arbitration.shipcontroller-artifact.json` - deterministic
  ESP32 ShipController artifact for the slice
- `boiler-supervisor-arbitration.package-overview.fixture.json` - canonical
  config-studio read-only package overview fixture

## End-To-End Gate

The accepted Wave 17 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_arbitration -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`
