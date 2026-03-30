# Wave 9 PID Autotune Freeze Checkpoint

Status: frozen
Date: 2026-03-30

Wave 9 is accepted as the specialized PID autotune execution baseline.

## Canonical Rules

- `pid_autotune` is no longer metadata-only
- the Wave 9 autotune lane closes the full path:
  `ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio service surface`
- recommendation lifecycle is canonical for this slice:
  - recommendation becomes available through result payload
  - apply/reject remain explicit actions
  - confirmation rules remain contract-driven
- progress payload is canonical for the autotune lane
- the generic operations spine from Wave 6 remains intact
- the generic UI/service lifecycle from Wave 7 remains intact
- the frozen Wave 8 reset execution baseline remains intact

## Frozen Baseline

Frozen after `PR-21F`:

- additive shared contract vocabulary for runnable PID autotune
- target-neutral materialized autotune execution metadata
- synthetic ESP32 adapter support for runnable autotune, progress payload, and
  recommendation lifecycle
- specialized Config Studio autotune lane on top of the generic operation
  surface
- canonical end-to-end PID autotune slice and reference snapshots

After freeze:

- Wave 9 changes are additive-only
- bugfix-only changes are allowed
- no new generic runnable kinds are implied by Wave 9
- no real target-side tuning algorithm is implied by Wave 9
- no Boiler/domain package work is implied by Wave 9
- no comms expansion is implied by Wave 9
- no shared-package redesign is implied by Wave 9

## Canonical Evidence

Wave 9 baseline is supported by:

- `packages/runtime-pack-schema`
- `packages/target-adapter-contracts`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/pid-controller`

## Next Allowed Step

Wave 9 is frozen.

The next phase must open separately as a new planning checkpoint. It is not
implicitly opened by this freeze.
