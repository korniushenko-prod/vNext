# ADR-0011: Wave 12 Package Coordination Is Authoring-Only And Child-Lane-Bounded

Status: accepted
Date: 2026-03-30

## Context

Wave 12 extends the frozen package baseline with package-level coordination and
package proxy operations.

The architectural risk is to let package coordination become a hidden package
runtime, package execution engine, or boiler-specific control layer instead of
remaining a narrow orchestration surface over already flattened child objects
and already accepted child operation lanes.

The accepted reference slice is `BoilerSupervisorCoordination v1`.

## Decision

Wave 12 package coordination is accepted as authoring-only, metadata-first, and
child-lane-bounded.

The canonical rules are:

- package coordination lives as additive authoring metadata on the package
  definition and as target-neutral metadata in `RuntimePack.package_coordination`
- package coordination may summarize package state, coordination rollups,
  traces, and package proxy operations only
- package coordination must resolve only to flattened child objects, child
  ports, and already materialized child operations
- package coordination does not create a package execution kind
- package coordination does not create hidden child logic, hidden hardware
  acquisition, hidden safety behavior, or package-specific imperative hooks
- target artifacts may expose deterministic `package_coordination` metadata, but
  this remains package-level summary/proxy metadata only
- UI may expose a read-only package coordination surface, but no package
  editor, package backend transport, or package execution engine is implied
- `BoilerSupervisorCoordination v1` remains supervisory only and does not imply
  burner safety, flame supervision, ignition sequence, or certified shutdown
  logic

## Consequences

Positive:

- the package layer now proves package-level coordination without breaking
  package neutrality or child execution ownership
- child execution lanes remain the only execution lanes; package coordination
  may summarize or proxy them without replacing them
- the platform gains a reusable coordination surface for future supervisory
  package families

Constraints after freeze:

- Wave 12 changes are additive-only beyond bugfixes
- no package execution engine is allowed
- no package-specific runtime hook is allowed
- no package-specific backend transport is allowed
- no burner-management or safety expansion is implied by this wave

## Canonical Evidence

Wave 12 freeze is evidenced by:

- `packages/project-schema`
- `packages/runtime-pack-schema`
- `packages/target-adapter-contracts`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-supervisor-coordination`
