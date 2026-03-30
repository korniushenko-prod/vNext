# PumpSkidSupervisorModesExecution v1

## Purpose

`PumpSkidSupervisorModesExecution v1` is the mandatory non-boiler acceptance
slice for Wave 14 package mode / phase execution baseline.

It proves that the same bounded package transition vocabulary works outside a
boiler-oriented domain and stays package-neutral.

## Scope

Included here:

- non-boiler package execution contract
- bounded mode vocabulary: `off`, `auto`, `service`
- bounded phase vocabulary: `idle`, `prime`, `run`, `flush`
- bounded transition intents: `request_mode_change`, `request_phase_start`,
  `request_phase_abort`
- self-contained project-local object types and package wiring
- canonical runtime snapshot
- deterministic ESP32 target artifact
- canonical config-studio package overview fixture

Intentionally excluded:

- real package execution hooks
- vendor-specific skid logic

## Canonical Rules

- non-boiler acceptance is mandatory for Wave 14
- package mode execution remains declarative and package-neutral
- transition lanes stay bounded and do not become a sequence engine
- the same execution vocabulary must fit both reference domains

## Files In This Slice

- `pump-skid-supervisor-modes-execution.package-definition.json` - canonical
  non-boiler package execution contract
- `pump-skid-supervisor-modes-execution.project.minimal.json` - minimal
  self-contained project instantiating the package
- `pump-skid-supervisor-modes-execution.project.e2e.json` - canonical e2e
  project for the bounded execution slice
- `pump-skid-supervisor-modes-execution.runtime-pack.snapshot.json` -
  canonical package-neutral runtime output including
  `package_mode_runtime_contract`
- `pump-skid-supervisor-modes-execution.shipcontroller-artifact.json` -
  deterministic ESP32 artifact for the bounded execution slice
- `pump-skid-supervisor-modes-execution.package-overview.fixture.json` -
  canonical config-studio package execution surface

## End-To-End Path

`ProjectModel -> materializeProject() -> RuntimePack.package_mode_phase -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package mode execution surface`

## Freeze Note

Wave 14 keeps package transition execution bounded and package-neutral. This
slice proves the same execution vocabulary works on the required non-boiler
acceptance domain.
