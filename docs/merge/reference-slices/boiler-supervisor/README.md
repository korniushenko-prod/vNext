# Boiler Supervisor v1

## Purpose

`BoilerSupervisor v1` is the Wave 11 reference slice for package-level
supervision.

It proves that a package can expose summary outputs, aggregate monitors, trace
groups, and proxied child operations while still remaining an authoring-only
assembly over frozen library objects.

## Scope

Included here:

- supervisory boiler package contract
- package-level summary outputs over child object ports
- aggregate health and alarm rollups
- trace groups composed from child signals
- operation proxies for frozen child operations
- reuse of frozen templates from Wave 5

Intentionally excluded:

- package execution kind
- direct package hardware bindings
- burner safety and certified shutdown logic
- package-specific runtime engine
- package-specific target hooks

## Canonical Rules

- package supervision stays authoring-only
- summary outputs point only to child runtime ports
- aggregate monitors and alarms roll up child outputs only
- operation proxies forward child operations and must not declare execution hooks
- package supervision does not change Wave 10 package-neutral runtime or target rules

## Files In This Slice

- `boiler-supervisor.package-definition.json` - canonical supervisory package contract
- `boiler-supervisor.project.minimal.json` - minimal project instantiating the package
- `boiler-supervisor.project.e2e.json` - self-contained end-to-end project for package supervision
- `boiler-supervisor.runtime-pack.snapshot.json` - canonical runtime pack including `package_supervision`
- `boiler-supervisor.shipcontroller-artifact.json` - canonical target artifact including package supervision metadata
- `boiler-supervisor.package-overview.fixture.json` - canonical read-only package supervision surface for `config-studio`

## End-to-End Gate

The accepted Wave 11 path is:

`Package-based ProjectModel -> materializeProject() -> RuntimePack.package_supervision -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package supervision surface`

Required negative coverage remains canonical here:

- unresolved package member still fails before flattening
- unsupported binding kind still fails in target compatibility without package hooks
- illegal package default override still fails during package flattening
- package supervision remains read-only and execution-neutral at the package layer

## Freeze Note

Wave 11 expands the package authoring layer with supervision metadata, but it
does not reopen package execution semantics.
