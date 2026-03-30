# PumpSkidSupervisorInterlocks v1

## Purpose

`PumpSkidSupervisorInterlocks v1` is the mandatory non-boiler acceptance slice
for Wave 15 package permissive/interlock baseline.

It proves that the same package-neutral gating model works on a second domain
without leaking boiler-specific wording, safety assumptions, or domain-specific
execution behavior into shared package layers.

## Scope

Included here:

- non-boiler reference package contract
- permissives and interlocks over child member ports
- gate summary and transition guard metadata
- package summary outputs, aggregate monitor, and trace group
- self-contained project-local member object type

Intentionally excluded:

- skid-specific imperative runtime
- package execution hooks or manual overrides
- safety workflows or trip/reset semantics

## Canonical Rules

- package permissive/interlock remains generic and package-neutral
- pump-skid domain is the mandatory second acceptance domain
- gate summary is derived only from child member outputs
- transition guards stay declarative and link only to frozen package mode/phase transitions

## Files In This Slice

- `pump-skid-supervisor-interlocks.package-definition.json` - canonical
  non-boiler package permissive/interlock contract
- `pump-skid-supervisor-interlocks.project.minimal.json` - minimal self-contained
  project instantiating the package
- `pump-skid-supervisor-interlocks.project.e2e.json` - canonical end-to-end
  project for the permissive/interlock slice
- `pump-skid-supervisor-interlocks.runtime-pack.snapshot.json` - canonical
  runtime pack including `package_permissive_interlock`
- `pump-skid-supervisor-interlocks.shipcontroller-artifact.json` - deterministic
  ESP32 artifact for the permissive/interlock slice
- `pump-skid-supervisor-interlocks.package-overview.fixture.json` - canonical
  config-studio package permissive/interlock surface

## End-To-End Gate

The accepted Wave 15 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_permissive_interlock -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`

## Freeze Note

Wave 15 keeps package-level gating read-only and generic across domains. This
slice does not introduce any pump-skid-specific runtime semantics.
