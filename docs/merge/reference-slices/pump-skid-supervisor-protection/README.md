# PumpSkidSupervisorProtection v1

## Purpose

`PumpSkidSupervisorProtection v1` is the mandatory non-boiler acceptance slice
for Wave 16 package protection/recovery baseline.

It proves that the same package-neutral trip/inhibit/recovery model works on a
second domain without leaking boiler-specific wording, safety assumptions, or
vendor-specific recovery behavior into shared package layers.

## Scope

Included here:

- non-boiler reference package contract
- package trips, inhibits, and protection summary metadata
- recovery request definitions over child operations
- package summary outputs, aggregate monitor, and trace group
- self-contained project-local member object type

Intentionally excluded:

- skid-specific imperative runtime
- certified safety workflows
- package-local execution engines

## Canonical Rules

- package protection/recovery remains generic, package-neutral, and non-safety
- pump-skid domain is the mandatory second acceptance domain
- trips and inhibits are derived only from child member outputs
- recovery requests stay declarative and proxy only frozen child operations

## Files In This Slice

- `pump-skid-supervisor-protection.package-definition.json` - canonical
  non-boiler package protection/recovery contract
- `pump-skid-supervisor-protection.project.minimal.json` - minimal self-contained
  project instantiating the package
- `pump-skid-supervisor-protection.project.e2e.json` - canonical end-to-end
  project for the protection/recovery slice
- `pump-skid-supervisor-protection.runtime-pack.snapshot.json` - canonical
  target-neutral runtime-pack output
- `pump-skid-supervisor-protection.shipcontroller-artifact.json` - canonical
  deterministic ShipController artifact output
- `pump-skid-supervisor-protection.package-overview.fixture.json` - canonical
  read-only package overview surface fixture

## End-To-End Gate

The accepted Wave 16 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_protection_recovery -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`

## Freeze Note

Wave 16 keeps package-level protection/recovery generic and non-safety across
domains. This slice does not introduce any pump-skid-specific runtime or safety
semantics.
