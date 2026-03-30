# ADR-0005 Operations Spine Is Metadata-First

Accepted. Wave 6 freezes the generic operations runtime spine as a metadata-first,
runtime-neutral baseline.

## Decision

- the operations spine is a generic layer for all operations, not a special path
  for PID autotune
- `RuntimePack.operations` is the canonical materialized representation of
  operation metadata
- operation ids are stable and qualified by owner instance scope
- `operation_runtime_contract` describes target-neutral runtime capability shape
  and does not imply execution is implemented
- target adapter invoke/cancel/readback contracts are generic and target-neutral
- target artifacts may carry deterministic metadata-only operation sections
- target artifacts must not introduce imperative execution hooks
- `PID autotune` remains metadata-only on the frozen Wave 6 baseline
- UI and service lifecycle are not part of Wave 6

## Freeze Rule

- Wave 6 is frozen as additive-only
- bugfix-only changes are allowed beyond this point
- no target-specific execution fields are allowed inside `RuntimePack`
- no template-specific operation runtime fields are allowed
- no PID-autotune-specific runtime hacks are allowed
- no UI-driven contract changes are allowed

## Consequence

Wave 6 now provides a stable generic contract spine that later phases can read
without reopening runtime or target contracts. Future execution backbones,
service lifecycle UI, and autotune-specific flows must build on this frozen
metadata-first layer instead of changing it retroactively.
