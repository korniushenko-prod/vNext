# BoilerSupervisorInterlocks v1

## Purpose

`BoilerSupervisorInterlocks v1` is the boiler-like acceptance slice for Wave 15
package permissive/interlock baseline.

It proves that package-level gating can be expressed as package-neutral,
read-only metadata over flattened child members without opening safety runtime,
manual overrides, or boiler-specific execution semantics.

## Scope

Included here:

- boiler-like reference package contract
- permissives and interlocks over child member ports
- gate summary and transition guard metadata
- package summary outputs, aggregate monitor, and trace group
- self-contained project-local member object type

Intentionally excluded:

- safety logic or certified shutdown semantics
- package execution hooks or manual overrides
- domain-specific target/runtime fields

## Canonical Rules

- package permissive/interlock remains generic and package-neutral
- boiler-like content is reference-only and does not define safety semantics
- gate summary is derived only from child member outputs
- transition guards stay declarative and link only to frozen package mode/phase transitions

## Files In This Slice

- `boiler-supervisor-interlocks.package-definition.json` - canonical boiler-like
  package permissive/interlock contract
- `boiler-supervisor-interlocks.project.minimal.json` - minimal self-contained
  project instantiating the package
- `boiler-supervisor-interlocks.project.e2e.json` - canonical end-to-end project
  for the permissive/interlock slice
- `boiler-supervisor-interlocks.runtime-pack.snapshot.json` - canonical runtime
  pack including `package_permissive_interlock`
- `boiler-supervisor-interlocks.shipcontroller-artifact.json` - deterministic
  ESP32 artifact for the permissive/interlock slice
- `boiler-supervisor-interlocks.package-overview.fixture.json` - canonical
  config-studio package permissive/interlock surface

## End-To-End Gate

The accepted Wave 15 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_permissive_interlock -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`

## Freeze Note

Wave 15 opens only bounded package-level gating metadata. It does not introduce
safety runtime, package overrides, or boiler-specific semantics in shared
layers.
