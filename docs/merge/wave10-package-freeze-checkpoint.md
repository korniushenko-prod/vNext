# Wave 10 Package Freeze Checkpoint

Status: frozen
Date: 2026-03-30

Wave 10 is accepted as the first package assembly baseline.

## Canonical Rules

- packages are authoring-layer assembly only
- `PackageDefinition` and `PackageInstance` stay inside `ProjectModel`
- `materializer-core` flattens package-based projects into ordinary effective
  runtime instances, signals, connections, monitors, operations, and resources
- `RuntimePack` remains package-neutral
- target artifacts remain package-neutral
- packages do not create a package execution kind
- explicit-expanded and package-based paths are equivalent when effective
  values are identical
- `BoilerPackageSkeleton v1` is a supervisory skeleton only, not burner
  safety, flame supervision, ignition sequencing, or certified shutdown logic

## Frozen Baseline

Frozen after `PR-22G`:

- additive authoring contracts for package definitions and package instances
- `BoilerPackageSkeleton v1` reference slice
- package flattening into ordinary effective runtime objects
- deterministic package-neutral ShipController artifact emission
- read-only package overview surface in `config-studio`
- one canonical end-to-end package path with negative coverage

After freeze:

- Wave 10 changes are additive-only
- bugfix-only changes are allowed
- no package-specific runtime kind is allowed
- no package-specific target section is allowed
- no package execution engine is allowed
- no package editor/builder UX is implied by this freeze
- no full Boiler domain expansion is implied by this freeze

## Canonical Evidence

Wave 10 baseline is supported by:

- `packages/project-schema`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-package-skeleton`

## Next Allowed Step

Wave 10 is frozen.

The next phase must open separately as a new planning checkpoint. It is not
implicitly opened by this freeze.
