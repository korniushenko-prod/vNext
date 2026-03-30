# ADR-0007 Wave 8 Execution Baseline Is Generic

Accepted. Wave 8 freezes a generic operation execution baseline for simple and
safe reset operations without opening PID-specific execution.

## Decision

- Wave 8 is not a "PID autotune execution" phase
- Wave 8 proves the generic execution spine only on frozen reset operations
- runnable baseline kinds are frozen exactly as:
  - `reset_totalizer`
  - `reset_counter`
  - `reset_interval`
- no other operation kind is considered runnable baseline without a new phase
  and a separate decision
- target execution remains synthetic and contract-driven on this baseline
- UI execution remains synthetic and contract-driven on this baseline
- `PID autotune` remains metadata-only on the frozen Wave 8 baseline
- Wave 8 does not introduce PID-specific execution hooks, target internals, or
  special-case UI paths

## Freeze Rule

- Wave 8 is frozen as additive-only
- bugfix-only changes are allowed beyond this point
- no new runnable kinds are added under Wave 8
- no real imperative execution engine is implied by Wave 8
- no long-running autotune lifecycle is implied by Wave 8
- no apply/reject recommendation flow is implied by Wave 8
- no Boiler, comms expansion, or unrelated execution work is opened by this
  freeze

## Consequence

Wave 8 now provides a stable generic execution baseline over the already frozen
operations spine and UI/service lifecycle layers. The next allowed execution
phase is Wave 9, where `PID autotune` can be opened explicitly as a specialized
long-running operation path without rewriting the generic baseline.
