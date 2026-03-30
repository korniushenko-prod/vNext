# Boiler Package Skeleton v1

## Purpose

`BoilerPackageSkeleton v1` is the first package-level reference slice in
`vNext`.

It proves that a domain package can stay authoring-only while still being built
from frozen object, template, monitoring, and communications baselines.

## Scope

Included in this skeleton:

- package contract and package instance boundary
- pressure-loop member via `PIDController`
- runtime and maintenance members via `RunHoursCounter` and `MaintenanceCounter`
- basic monitoring via `ThresholdMonitor`
- feedwater measurement placeholder via `PulseFlowmeter`
- frozen Wave 5 template reuse

Intentionally excluded:

- burner safety
- flame supervision
- ignition permissives
- certified shutdown path
- vendor-specific burner assumptions
- package-specific runtime kinds or target sections

## Canonical rules

- package is an authoring-level reusable assembly
- package never creates a runtime `package_execution_kind`
- package must flatten later into ordinary effective instances, signals,
  monitors, operations, and target artifacts
- this skeleton is non-safety and supervisory only

## Files in this slice

- `boiler-supervisor.package-definition.json` - canonical package contract
- `boiler-package-skeleton.project.minimal.json` - minimal project using the package
- `boiler-package-skeleton.project.e2e.json` - self-contained end-to-end package project with object types and hardware bindings
- `boiler-package-skeleton.runtime-pack.snapshot.json` - canonical package-neutral runtime pack after flattening
- `boiler-package-skeleton.shipcontroller-artifact.json` - canonical package-neutral ShipController artifact
- `boiler-package-skeleton.package-overview.fixture.json` - canonical read-only package overview fixture for config-studio

## Decision

`BoilerPackageSkeleton v1` is the first accepted package-level boundary. It is
deliberately a skeleton package, not a full boiler controller.

## End-to-End Gate

The accepted Wave 10 package path is:

`Package-based ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package overview`

Required negative coverage also stays canonical here:

- unresolved package member fails before flattening
- unsupported binding kind fails in target compatibility without package-specific hooks
- illegal package default override fails with package flattening diagnostics

## Freeze Note

Wave 10 freezes this slice as the first accepted package baseline.

- package remains an authoring-layer assembly only
- runtime and target outputs remain package-neutral
- explicit-expanded and package-based paths remain invariant when effective
  values are the same
- this slice stays supervisory only and does not imply burner-management or
  safety logic
