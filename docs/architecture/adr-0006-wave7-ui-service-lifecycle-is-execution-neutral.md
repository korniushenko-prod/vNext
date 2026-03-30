# ADR-0006 Wave 7 UI Service Lifecycle Is Execution-Neutral

Accepted. Wave 7 freezes the generic UI/service lifecycle for operations as an
execution-neutral front-end baseline.

## Decision

- Wave 7 builds only on the frozen generic operations spine from Wave 6
- Config Studio reads operation metadata, snapshots, and transport intents as
  the canonical UI/service inputs
- the UI/service layer is generic across operation kinds and is not specialized
  for PID autotune
- invoke/cancel wiring stays browser/service-side and synthetic on this
  baseline
- backend execution, target-side engines, and imperative target hooks are not
  part of Wave 7
- `PID autotune` remains a metadata-only operation lane on this frozen baseline
- frozen operation kinds such as `reset_counter` and `reset_interval` are not
  renamed by Wave 7

## Freeze Rule

- Wave 7 is frozen as additive-only
- bugfix-only changes are allowed beyond this point
- no backend execution hooks are added inside Config Studio as part of Wave 7
- no target-specific UI state model is introduced
- no wizard flows are introduced for autotune or service operations
- no shared package contracts are changed from the UI layer

## Consequence

Wave 7 now provides a stable generic UI/service baseline over operations:
read-only surfaces, transport intent wiring, and synthetic lifecycle proof. Any
future real execution path must open separately in Wave 8 instead of extending
Wave 7 by stealth.
