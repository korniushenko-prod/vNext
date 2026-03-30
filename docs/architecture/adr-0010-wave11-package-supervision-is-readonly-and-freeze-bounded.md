# ADR-0010: Wave 11 Package Supervision Is Readonly And Freeze-Bounded

Status: accepted
Date: 2026-03-30

## Context

Wave 11 extends the frozen Wave 10 package baseline with package-level
supervision metadata.

The architectural risk is to let package supervision become a hidden package
runtime, package execution engine, or package-specific target layer instead of
remaining a supervisory authoring/service surface over already flattened child
objects and their frozen execution lanes.

The accepted reference slice is `BoilerSupervisor v1`.

## Decision

Wave 11 package supervision is accepted as read-only, metadata-first, and
freeze-bounded.

The canonical rules are:

- package supervision lives as authoring contract metadata on the package
  definition and as target-neutral metadata in `RuntimePack.package_supervision`
- package supervision must derive only from flattened child objects, child
  ports, child traces, and child operations
- package supervision does not create a package execution kind
- package supervision does not create hidden child logic, hidden accumulation,
  hidden hardware bindings, or package-specific imperative hooks
- target artifacts may expose deterministic `package_supervision` metadata, but
  this remains summary/proxy metadata only
- UI may expose a read-only package supervision surface, but no package editor,
  backend transport, or package execution engine is implied
- `BoilerSupervisor v1` remains supervisory only and does not imply burner
  safety, ignition sequence, flame supervision, or certified shutdown logic

## Consequences

Positive:

- the package layer now proves package-level summary and supervision without
  breaking package neutrality
- child execution lanes remain the only execution lanes; package supervision can
  summarize or proxy them without replacing them
- the platform gains a reusable service/supervision surface for future package
  families

Constraints after freeze:

- Wave 11 changes are additive-only beyond bugfixes
- no package execution engine is allowed
- no package-specific runtime hooks are allowed
- no package-specific backend transport is allowed
- no burner-management or safety expansion is implied by this wave

## Canonical Evidence

Wave 11 freeze is evidenced by:

- `packages/project-schema`
- `packages/materializer-core`
- `targets/esp32-target-adapter`
- `apps/config-studio`
- `docs/merge/reference-slices/boiler-supervisor`
