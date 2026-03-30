# ADR-0008: Wave 9 PID Autotune Is Specialized And Freeze-Bounded

Status: accepted
Date: 2026-03-30

## Context

Wave 6 froze the generic operations spine as metadata-first.

Wave 7 froze the generic UI/service lifecycle as execution-neutral.

Wave 8 froze the generic runnable execution baseline for exactly these kinds:

- `reset_totalizer`
- `reset_counter`
- `reset_interval`

Wave 9 then opened a single specialized execution lane for `PID autotune`.

The important architectural risk at this point is to avoid turning that
specialized lane into a back door for:

- new generic runnable kinds;
- target-specific execution semantics leaking into shared contracts;
- UI logic that stops being generic outside the autotune boundary;
- silent redefinition of the Wave 8 reset baseline.

## Decision

Wave 9 is accepted as a specialized execution layer on top of the frozen
generic operations baseline.

The canonical rules are:

- `pid_autotune` is no longer metadata-only
- `pid_autotune` is the only specialized runnable operation opened by Wave 9
- the generic operations spine from Wave 6 remains canonical and unchanged in
  meaning
- the generic UI/service lifecycle from Wave 7 remains canonical and unchanged
  in meaning
- the Wave 8 reset execution baseline remains frozen and unchanged in meaning
- recommendation lifecycle, apply/reject confirmation, and progress payload are
  canonical for the PID autotune lane only
- materialization remains target-neutral even when it emits runnable autotune
  metadata
- adapter/runtime support remains synthetic, offline-only, and contract-driven
  in the current baseline

## Consequences

Positive:

- PID autotune now has a full end-to-end reference path
- recommendation handling is modeled explicitly instead of as UI convention
- the platform proves that specialized execution can be added without breaking
  the generic spine

Constraints after freeze:

- Wave 9 changes are additive-only beyond bugfixes
- no new generic runnable kinds are implied by Wave 9
- no Boiler/domain package work is implied by Wave 9
- no comms expansion is implied by Wave 9
- no shared-package redesign is implied by Wave 9

## Canonical Evidence

Wave 9 freeze is evidenced by:

- `packages/runtime-pack-schema`
- `packages/target-adapter-contracts`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/pid-controller`
