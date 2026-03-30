# ADR-0013: Wave 14 Package Mode Execution Is Bounded And Package-Neutral

## Status

Accepted

## Context

Wave 13 froze package mode / phase as read-only metadata over flattened child
objects. Wave 14 opens the first execution baseline for package-level
orchestration, but only in a narrow form:

- package execution must stay generic and package-neutral
- package must not become a new execution kind
- bounded intents only:
  - `request_mode_change`
  - `request_phase_start`
  - `request_phase_abort`
- dual-domain acceptance is mandatory:
  - boiler-like reference slice
  - `PumpSkidSupervisorModesExecution v1`

The system still must not open:

- full sequence runtime
- child imperative hooks
- burner safety or vendor-specific boiler execution
- package-specific target sections

## Decision

Wave 14 is accepted only as a bounded package mode / phase execution baseline.

That means:

1. Authoring contracts may describe bounded package transition intents.
2. `materializer-core` may emit only package-neutral execution metadata in
   `RuntimePack.package_mode_runtime_contract` and
   `RuntimePack.package_mode_phase`.
3. Target adapters may expose only synthetic transition support, synthetic
   snapshots, compatibility diagnostics, and deterministic artifact metadata.
4. `config-studio` may expose only a synthetic service surface with active
   transition lane, bounded transition cards, guard badges, and request
   previews.

No layer in Wave 14 is allowed to imply a full package sequence engine.

## Consequences

- Package transition execution remains additive and bounded.
- Boiler-like content remains reference-only and does not become a privileged
  product axis.
- Non-boiler acceptance remains mandatory for the wave to stay platform-wide.
- Future deeper package execution work, if any, must open via a new directive
  rather than by expanding Wave 14 in place.
