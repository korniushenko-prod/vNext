# ADR-0012: Wave 13 Package Mode / Phase Is Authoring-Only And Sequence-Neutral

Status: accepted
Date: 2026-03-30

## Context

Wave 13 extends the frozen package baseline with package-level mode / phase
metadata.

The architectural risk is to let package mode / phase become a hidden package
sequence runtime, a package execution kind, or a boiler-specific orchestration
engine instead of remaining a narrow authoring/service surface over already
flattened child objects.

The accepted reference slices are `BoilerSupervisorModes v1` and
`PumpSkidSupervisorModes v1`.

## Decision

Wave 13 package mode / phase is accepted as authoring-only, metadata-first, and
sequence-neutral.

The canonical rules are:

- package mode / phase lives as additive authoring metadata on the package
  definition and as target-neutral metadata in `RuntimePack.package_mode_phase`
- package mode / phase may express active mode, active phase, summary entries,
  groups, traces, and package links only
- package mode / phase must resolve only to flattened child objects and child
  ports
- package mode / phase does not create a package execution kind
- package mode / phase does not create hidden sequencing logic, hidden child
  logic, hidden hardware acquisition, or target-specific imperative hooks
- target artifacts may expose deterministic `package_mode_phase` metadata, but
  this remains package-level summary metadata only
- UI may expose a read-only package mode / phase surface, but no package
  editor, package backend transport, package execution engine, or sequencing
  wizard is implied
- boiler-like reference content remains content only; the contract itself stays
  domain-neutral and is validated by both boiler-like and non-boiler slices

## Consequences

Positive:

- the package layer now proves reusable mode / phase metadata without breaking
  package neutrality or child execution ownership
- dual-domain acceptance demonstrates that the contract is generic, not
  boiler-specific
- future package families can reuse the same mode / phase language without
  implying a sequence runtime

Constraints after freeze:

- Wave 13 changes are additive-only beyond bugfixes
- no package execution engine is allowed
- no hidden sequence runtime is allowed
- no package-specific backend transport is allowed
- no burner-management or safety expansion is implied by this wave

## Canonical Evidence

Wave 13 freeze is evidenced by:

- `packages/project-schema`
- `packages/runtime-pack-schema`
- `packages/target-adapter-contracts`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-supervisor-modes`
- `docs/merge/reference-slices/pump-skid-supervisor-modes`
