# Wave 6 Operations Freeze Checkpoint

Status: frozen
Date: 2026-03-29

Wave 6 is accepted as the generic operations runtime spine baseline.

## Canonical Rules

- the operations spine is generic and runtime-neutral
- `RuntimePack.operations` is the canonical materialized operations metadata
- operation ids are stable and qualified by owner instance scope
- `operation_runtime_contract` is a capability contract, not an execution claim
- target artifacts may expose metadata-only operation sections
- target artifacts must not expose imperative execution hooks
- `PID autotune` remains metadata-only on this baseline

## Frozen Baseline

Frozen after `PR-18E`:

- generic operations contracts in `runtime-pack-schema`
- generic target adapter invoke/cancel/readback contracts
- materializer alignment for `RuntimePack.operations`
- metadata-only esp32 target support
- end-to-end metadata-only operation slices

After freeze:

- operation changes are additive-only
- bugfix-only changes are allowed
- no execution hooks are added to `RuntimePack`
- no target-specific imperative operation fields are added
- no UI/service lifecycle scope is implied by this freeze

## Canonical Evidence

Wave 6 baseline is supported by:

- `packages/runtime-pack-schema`
- `packages/target-adapter-contracts`
- `packages/materializer-core`
- `targets/esp32-target-adapter/tests`
- operation-bearing reference slices under `docs/merge/reference-slices`

## Next Allowed Step

Only Wave 7 opens after this checkpoint:

- `PR-19A` - operation snapshot read models for UI
- `PR-19B` - generic operation cards/list/status surfaces
- `PR-19C` - invoke/cancel/confirmation UX wiring
- `PR-19D` - object service panels using generic operation UX
- `PR-19E` - freeze Wave 7
