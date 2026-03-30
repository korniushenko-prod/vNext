# ADR-0014: Wave 15 Package Permissive / Interlock Is Generic And Non-Safety

## Status

Accepted

## Context

Wave 14 froze bounded package mode / phase execution as package-neutral,
synthetic-capable metadata. The next allowed step is package-level gating, but
only in a narrow and explicitly non-safety form:

- package permissives and interlocks must remain generic and package-neutral
- boiler-like content may be used only as a reference domain
- a second non-boiler acceptance domain is mandatory
- package gating must remain read-only
- no manual overrides, trip/reset workflows, or safety execution may be opened

The system still must not open:

- safety logic
- burner-specific fields in shared contracts
- package execution hooks
- package-specific target runtime
- backend transport or operator override workflows

## Decision

Wave 15 is accepted only as a bounded package permissive/interlock baseline.

That means:

1. Authoring contracts may describe permissives, interlocks, gate summaries,
   summary outputs, aggregate monitors, trace groups, and transition guards.
2. `materializer-core` may emit only package-neutral runtime metadata in
   `RuntimePack.package_permissive_interlock`.
3. Target adapters may expose only deterministic package gating artifacts,
   synthetic snapshots, and compatibility diagnostics.
4. `config-studio` may expose only a read-only package gating surface with gate
   summaries, reason presentation, and transition guard presentation.

No layer in Wave 15 is allowed to imply safety behavior or package imperative
runtime.

## Consequences

- Package gating remains additive and read-only.
- Boiler-like content remains reference-only and non-privileged.
- Pump-skid acceptance remains mandatory so the wave stays platform-wide.
- Future package execution or safety work, if any, must open through a new
  directive rather than by expanding Wave 15 in place.
