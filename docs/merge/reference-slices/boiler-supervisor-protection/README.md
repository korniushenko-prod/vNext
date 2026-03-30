# BoilerSupervisorProtection v1

## Purpose

`BoilerSupervisorProtection v1` is the boiler-like acceptance slice for Wave 16
package protection/recovery baseline.

It proves that package-level trips, inhibits, and recovery requests can be
expressed as package-neutral metadata over child members without opening safety
runtime, vendor logic, or hidden package execution semantics.

## Scope

Included here:

- boiler-like reference package contract
- package trips, inhibits, and protection summary metadata
- recovery request definitions over child operations
- package summary outputs, aggregate monitor, and trace group
- self-contained project-local member object type

Intentionally excluded:

- burner safety or certified flame safeguard logic
- package-local imperative sequence runtime
- vendor-specific reset workflows

## Canonical Rules

- package protection/recovery remains generic, package-neutral, and non-safety
- boiler-like content is reference-only and does not define certified safety semantics
- trips and inhibits are derived only from child member outputs
- recovery requests stay declarative and proxy only frozen child operations

## Files In This Slice

- `boiler-supervisor-protection.package-definition.json` - canonical boiler-like
  package protection/recovery contract
- `boiler-supervisor-protection.project.minimal.json` - minimal self-contained
  project instantiating the package
- `boiler-supervisor-protection.project.e2e.json` - canonical end-to-end
  project for the protection/recovery slice
- `boiler-supervisor-protection.runtime-pack.snapshot.json` - canonical
  target-neutral runtime-pack output
- `boiler-supervisor-protection.shipcontroller-artifact.json` - canonical
  deterministic ShipController artifact output
- `boiler-supervisor-protection.package-overview.fixture.json` - canonical
  read-only package overview surface fixture

## End-To-End Gate

The accepted Wave 16 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_protection_recovery -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`

## Freeze Note

Wave 16 opens only generic package protection/recovery metadata and bounded
recovery request lanes. It does not introduce safety runtime or vendor-specific
protection semantics.
