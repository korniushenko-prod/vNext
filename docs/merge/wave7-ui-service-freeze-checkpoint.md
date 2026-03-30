# Wave 7 UI Service Freeze Checkpoint

Status: frozen
Date: 2026-03-30

Wave 7 is accepted as the generic UI/service lifecycle baseline for operations
inside Config Studio.

## Canonical Rules

- the Wave 7 UI/service layer is generic over operation kinds
- the UI reads operation metadata, snapshots, and transport intents as the
  canonical front-end inputs
- the UI/service layer remains metadata-first and execution-neutral
- invoke/cancel wiring remains browser/service-side and synthetic on this
  baseline
- `PID autotune` remains metadata-only on the frozen Wave 7 baseline
- frozen operation kinds such as `reset_counter` and `reset_interval` are not
  renamed by Wave 7
- the UI is not a source of truth for operation semantics

## Frozen Baseline

Frozen after `PR-19E`:

- UI/service contracts in `apps/config-studio/src/operations/contracts`
- read-only operation surface in `apps/config-studio`
- invoke/cancel transport boundary in `apps/config-studio`
- synthetic lifecycle progression and front-end e2e coverage in
  `apps/config-studio/tests/operations`

After freeze:

- Wave 7 changes are additive-only
- bugfix-only changes are allowed
- no backend execution hooks are added under Wave 7
- no target-specific imperative hooks are added to Config Studio
- no wizard flows are implied by this freeze
- all real execution work moves to Wave 8

## Canonical Evidence

Wave 7 baseline is supported by:

- `apps/config-studio/public`
- `apps/config-studio/src/operations`
- `apps/config-studio/tests/operations`
- operation-bearing reference slices that remain metadata-first in earlier waves

## Next Allowed Step

Only Wave 8 opens after this checkpoint:

- `PR-20A` - execution contracts freeze-in
- `PR-20B` - esp32 target adapter execution baseline
- `PR-20C` - config-studio execution wiring
- `PR-20D` - end-to-end baseline operation slices
- `PR-20E` - freeze Wave 8
