# BoilerSupervisorModes v1

## Purpose

`BoilerSupervisorModes v1` is the boiler-like acceptance slice for Wave 13
package mode / phase metadata.

It proves that package mode / phase can stay generic, sequence-neutral, and
authoring-only even when the reference domain looks boiler-oriented.

## Scope

Included here:

- boiler-like reference package contract
- package mode definitions
- package phase definitions
- package mode and phase summary metadata
- mode groups, phase groups, and trace groups
- self-contained project-local object types for a clean e2e gate

Intentionally excluded:

- package execution kind
- hidden sequence executor
- burner safety, flame safeguard, or ignition logic
- package-specific runtime engine
- package-specific target execution hooks

## Canonical Rules

- package mode / phase stays authoring-only
- runtime and target outputs stay flattened and package-neutral
- boiler-like content remains reference content only
- active mode / phase and summaries resolve only through flattened child ports
- no package supervision or coordination lane is required for this slice

## Files In This Slice

- `boiler-supervisor-modes.package-definition.json` - canonical boiler-like package mode / phase contract
- `boiler-supervisor-modes.project.minimal.json` - minimal self-contained project instantiating the package
- `boiler-supervisor-modes.project.e2e.json` - canonical e2e project closing the full package mode / phase path
- `boiler-supervisor-modes.runtime-pack.snapshot.json` - canonical runtime pack including `package_mode_phase`
- `boiler-supervisor-modes.shipcontroller-artifact.json` - canonical ESP32 ShipController artifact including deterministic `package_mode_phase`
- `boiler-supervisor-modes.package-overview.fixture.json` - canonical read-only package mode / phase surface for `config-studio`

## End-To-End Path

`ProjectModel -> materializeProject() -> RuntimePack.package_mode_phase -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package mode / phase surface`

## Freeze Note

Wave 13 opens package mode / phase as a narrow metadata layer only. This slice
does not reopen package execution semantics.
