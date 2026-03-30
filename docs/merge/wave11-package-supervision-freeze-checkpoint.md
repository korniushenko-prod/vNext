# Wave 11 Package Supervision Freeze Checkpoint

Status: frozen
Date: 2026-03-30

Wave 11 is accepted as the first package-level supervision baseline.

## Canonical Rules

- package supervision remains authoring-only and metadata-first
- `RuntimePack.package_supervision` is the canonical target-neutral runtime
  form of package supervision
- package summary outputs, aggregate monitors or alarms, trace groups, and
  operation proxies must resolve only to flattened child objects and child
  operations
- target artifacts may expose deterministic `package_supervision` metadata, but
  package supervision remains execution-neutral at package level
- `config-studio` may expose a read-only package supervision surface, but no
  package editor, backend transport, or package execution engine is implied
- `BoilerSupervisor v1` remains supervisory only and does not imply
  burner-management, flame supervision, ignition sequencing, or certified
  shutdown logic

## Frozen Baseline

Frozen after `PR-23G`:

- additive package supervision contracts in `project-schema`,
  `runtime-pack-schema`, and `target-adapter-contracts`
- `BoilerSupervisor v1` reference slice
- deterministic `RuntimePack.package_supervision` materialization
- deterministic package supervision metadata in the ESP32 ShipController
  artifact
- read-only package supervision surface in `config-studio`
- one canonical end-to-end package supervision path with negative coverage

After freeze:

- Wave 11 changes are additive-only
- bugfix-only changes are allowed
- no package execution engine is allowed
- no package-specific runtime hook is allowed
- no package-specific backend transport is allowed
- no boiler/burner-management or safety expansion is implied by this freeze

## Canonical Evidence

Wave 11 baseline is supported by:

- `packages/project-schema`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-supervisor`

## Next Allowed Step

Wave 11 is frozen.

The next phase must open separately as a new planning checkpoint. It is not
implicitly opened by this freeze.
