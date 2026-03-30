# ADR-0009: Wave 10 Packages Are Authoring-Only And Freeze-Bounded

Status: accepted
Date: 2026-03-30

## Context

Wave 10 opens the first package-level baseline in `vNext`.

The architectural risk is to let packages become a new execution world instead
of a reusable authoring-layer assembly over already frozen objects, templates,
communications, and operations baselines.

The first accepted domain package is `BoilerPackageSkeleton v1`. That package
must prove package assembly without reopening:

- frozen Wave 4 communications baseline;
- frozen Wave 5 templates baseline;
- frozen generic operations/runtime layers from Waves 6–8;
- the specialized Wave 9 PID autotune lane.

## Decision

Wave 10 packages are accepted as authoring-only assembly contracts.

The canonical rules are:

- `PackageDefinition` and `PackageInstance` live only in the authoring model
- packages do not introduce a new runtime kind, target section, or execution
  engine
- `materializer-core` must flatten package members into ordinary effective
  instances, connections, monitors, operations, and resources
- `RuntimePack` remains package-neutral after flattening
- target artifacts remain package-neutral after emission
- explicit-expanded and package-based paths are equivalent when effective
  values are identical
- `BoilerPackageSkeleton v1` is explicitly a supervisory skeleton, not burner
  safety, flame supervision, ignition sequence, or certified shutdown logic

## Consequences

Positive:

- the platform proves domain assembly without breaking the authoring/runtime/
  target split
- package reuse stays compatible with frozen templates, comms, and operations
  baselines
- package overview UI can remain read-only and package-neutral

Constraints after freeze:

- Wave 10 changes are additive-only beyond bugfixes
- no package-specific runtime kind is allowed
- no package-specific target artifact section is allowed
- no package execution engine is allowed
- no full Boiler/burner-management expansion is implied by this wave

## Canonical Evidence

Wave 10 freeze is evidenced by:

- `packages/project-schema`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-package-skeleton`
