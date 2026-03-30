# ADR-0015: Wave 16 Package Protection / Recovery Is Generic And Non-Safety

## Status

Accepted

## Context

Wave 15 froze package permissive/interlock as generic, read-only gating
metadata. The next allowed step is package-level protection and recovery, but
only in a narrow and explicitly non-safety form:

- package trips and inhibits must remain generic and package-neutral
- boiler-like content may be used only as a reference domain
- a second non-boiler acceptance domain is mandatory
- recovery requests must stay declarative and child-proxy-only
- the package layer must remain read-only and non-safety

The system still must not open:

- certified safety semantics
- burner-specific shared vocabulary
- package execution runtime
- vendor-specific recovery workflow
- backend safety/recovery UI flow

## Decision

Wave 16 is accepted only as a bounded package protection/recovery baseline.

That means:

1. Authoring contracts may describe trips, inhibits, protection summary,
   recovery requests, diagnostic summaries, summary outputs, aggregate
   monitors, and trace groups.
2. `materializer-core` may emit only package-neutral runtime metadata in
   `RuntimePack.package_protection_recovery`.
3. Target adapters may expose only deterministic package protection artifacts,
   synthetic snapshots, and compatibility diagnostics.
4. `config-studio` may expose only a read-only package protection/recovery
   surface with protection summary, reason presentation, and recovery request
   presentation.

No layer in Wave 16 is allowed to imply safety behavior, certified logic, or
package imperative runtime.

## Consequences

- Package protection/recovery remains additive and read-only.
- Boiler-like content remains reference-only and non-privileged.
- Pump-skid acceptance remains mandatory so the wave stays platform-wide.
- Future safety or recovery workflow work, if any, must open through a new
  directive rather than by expanding Wave 16 in place.
