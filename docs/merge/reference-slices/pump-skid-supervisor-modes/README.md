# PumpSkidSupervisorModes v1

## Purpose

`PumpSkidSupervisorModes v1` is the mandatory non-boiler acceptance slice for
Wave 13 package mode / phase metadata.

It proves that the same package mode / phase contract works in a non-boiler
domain without pulling in boiler-specific semantics.

## Scope

Included here:

- non-boiler package mode definitions
- non-boiler package phase definitions
- package mode and phase summary metadata
- mode groups, phase groups, and trace groups
- self-contained project-local object types and package wiring

Intentionally excluded:

- package execution kind
- hidden sequence executor
- vendor-specific skid logic
- package-specific runtime engine
- package-specific target execution hooks

## Canonical Rules

- package mode / phase stays authoring-only
- runtime and target outputs stay flattened and package-neutral
- non-boiler acceptance is mandatory for Wave 13
- maintenance and monitoring stay child-owned and only summarized upward
- package mode / phase must not become a hidden sequence engine

## Files In This Slice

- `pump-skid-supervisor-modes.package-definition.json` - canonical non-boiler package mode / phase contract
- `pump-skid-supervisor-modes.project.minimal.json` - minimal self-contained project instantiating the package
- `pump-skid-supervisor-modes.project.e2e.json` - canonical e2e project closing the full package mode / phase path
- `pump-skid-supervisor-modes.runtime-pack.snapshot.json` - canonical runtime pack including `package_mode_phase`
- `pump-skid-supervisor-modes.shipcontroller-artifact.json` - canonical ESP32 ShipController artifact including deterministic `package_mode_phase`
- `pump-skid-supervisor-modes.package-overview.fixture.json` - canonical read-only package mode / phase surface for `config-studio`

## End-To-End Path

`ProjectModel -> materializeProject() -> RuntimePack.package_mode_phase -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package mode / phase surface`

## Freeze Note

Wave 13 stays sequence-neutral. This slice proves the package mode / phase layer
is generic beyond boiler-oriented reference content.
