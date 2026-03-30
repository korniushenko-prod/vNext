# BoilerSupervisorModesExecution v1

## Purpose

`BoilerSupervisorModesExecution v1` is the boiler-like acceptance slice for
Wave 14 package mode / phase execution baseline.

It proves that bounded package transition intents can be expressed on a
boiler-like supervisory package without turning the package layer into a hidden
sequence runtime or pulling in burner-specific execution semantics.

## Scope

Included here:

- boiler-like reference package contract
- bounded mode vocabulary: `off`, `auto`, `service`
- bounded phase vocabulary: `idle`, `precheck`, `run`, `shutdown`
- bounded transition intents: `request_mode_change`, `request_phase_start`,
  `request_phase_abort`
- self-contained project-local object types for clean authoring validation
- canonical runtime snapshot
- deterministic ESP32 target artifact
- canonical config-studio package overview fixture

Intentionally excluded:

- real package execution hooks
- burner safety, flame safeguard, or vendor-specific boiler logic

## Canonical Rules

- package mode execution remains generic and package-neutral
- package does not become a new execution kind
- transition intents stay bounded and declarative at the contract layer
- boiler-like content remains reference content only

## Files In This Slice

- `boiler-supervisor-modes-execution.package-definition.json` - canonical
  boiler-like package execution contract
- `boiler-supervisor-modes-execution.project.minimal.json` - minimal
  self-contained project instantiating the package
- `boiler-supervisor-modes-execution.project.e2e.json` - canonical e2e project
  for the bounded execution slice
- `boiler-supervisor-modes-execution.runtime-pack.snapshot.json` - canonical
  package-neutral runtime output including `package_mode_runtime_contract`
- `boiler-supervisor-modes-execution.shipcontroller-artifact.json` -
  deterministic ESP32 artifact for the bounded execution slice
- `boiler-supervisor-modes-execution.package-overview.fixture.json` -
  canonical config-studio package execution surface

## End-To-End Path

`ProjectModel -> materializeProject() -> RuntimePack.package_mode_phase -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package mode execution surface`

## Freeze Note

Wave 14 opens only the first bounded execution baseline for package mode /
phase. This slice still does not introduce full sequence runtime or package-
specific execution kinds.
