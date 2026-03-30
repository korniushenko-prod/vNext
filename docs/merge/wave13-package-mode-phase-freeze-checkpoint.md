# Wave 13 Package Mode / Phase Freeze Checkpoint

Status: frozen
Date: 2026-03-30

Wave 13 is accepted as the first package-level mode / phase baseline.

## Canonical Rules

- package mode / phase remains authoring-only, metadata-first, and
  sequence-neutral
- `RuntimePack.package_mode_phase` is the canonical target-neutral runtime form
  of package mode / phase metadata
- package mode / phase summaries, groups, traces, and active refs must resolve
  only to flattened child objects and child ports
- target artifacts may expose deterministic `package_mode_phase` metadata, but
  package mode / phase remains execution-neutral at package level
- `config-studio` may expose a read-only package mode / phase surface, but no
  package editor, backend transport, package execution engine, or sequencing
  wizard is implied
- `BoilerSupervisorModes v1` remains boiler-like reference content only
- `PumpSkidSupervisorModes v1` is the required non-boiler acceptance slice

## Frozen Baseline

Frozen after `PR-25G`:

- additive package mode / phase contracts in `project-schema`,
  `runtime-pack-schema`, and `target-adapter-contracts`
- `BoilerSupervisorModes v1` and `PumpSkidSupervisorModes v1` reference slices
- deterministic `RuntimePack.package_mode_phase` materialization
- deterministic package mode / phase metadata in the ESP32 ShipController
  artifact
- read-only package mode / phase surface in `config-studio`
- canonical dual-domain end-to-end package mode / phase coverage with negative
  diagnostics

After freeze:

- Wave 13 changes are additive-only
- bugfix-only changes are allowed
- no package execution engine is allowed
- no hidden sequence runtime is allowed
- no package-specific backend transport is allowed
- no burner-management or safety expansion is implied by this freeze

## Canonical Evidence

Wave 13 baseline is supported by:

- `packages/project-schema`
- `packages/runtime-pack-schema`
- `packages/target-adapter-contracts`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-supervisor-modes`
- `docs/merge/reference-slices/pump-skid-supervisor-modes`

## Next Allowed Step

Wave 13 is frozen.

The next phase must open separately as a new planning checkpoint. It is not
implicitly opened by this freeze.
