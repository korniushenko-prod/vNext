# @universal-plc/project-schema

Canonical authoring contract for `vNext` projects.

## Scope
- authoring model types
- structural validation
- fixtures for schema-level checks

## Non-goals
- no runtime pack logic
- no ESP32/target logic
- no UI/editor logic
- no semantic build/materialization

## Canonical rules
- `system` contains ordinary `instances`, `signals`, and additive authoring-only `packages`
- `system.routes` is forbidden as a canonical authoring field
- system signal endpoints are only `{ instance_id, port_id }`
- composition endpoints are only `parent_port` and `instance_port`
- validation in this package is structural only
- `ObjectTemplate` is authoring-only and does not define a runtime kind
- `template_ref` lives only in `ProjectModel`; `type_ref` remains the required effective type
- `PackageDefinition` and `PackageInstance` are authoring-only assembly contracts
- packages must flatten later into ordinary effective instances/signals; no package runtime kind is allowed

## Wave 10 freeze note
- Wave 10 freezes packages as authoring-only assembly contracts
- package-based and explicit-expanded projects must remain equivalent when effective values match
- `BoilerPackageSkeleton v1` is accepted only as a non-safety supervisory skeleton
- no package execution kind or package-specific target/runtime section is implied by this baseline

## Wave 11 freeze note
- Wave 11 freezes package supervision as additive authoring metadata over frozen package members
- package supervision sources must resolve only to child runtime ports and child operations
- package supervision does not create package execution hooks, hardware bindings, or backend transport semantics
- `BoilerSupervisor v1` is accepted only as a read-only supervisory package supervision slice

## Wave 12 contract note
- Wave 12 adds package coordination as additive authoring metadata beside package supervision
- package coordination expresses package state summaries and exposed proxy operations only
- package coordination must remain burner-safety-neutral and must not introduce a package execution kind

## Wave 12 freeze note
- Wave 12 freezes package coordination as additive authoring metadata over frozen package members
- package coordination state summaries, monitors, traces, and proxy operations must resolve only to child ports and child operations
- package coordination does not create package execution hooks, hidden acquisition, or safety/runtime semantics
- `BoilerSupervisorCoordination v1` is accepted only as a supervisory package coordination slice

## Wave 13 contract note
- Wave 13 adds package mode / phase as additive authoring metadata beside package supervision and package coordination
- package mode / phase expresses active mode, active phase, summaries, groups, and traces only
- package mode / phase must remain sequence-neutral and must not introduce a package execution kind or hidden sequence engine

## Wave 13 freeze note
- Wave 13 freezes package mode / phase as additive authoring metadata over frozen package members
- package mode / phase refs, summaries, groups, and traces must resolve only to child ports
- package mode / phase does not create package execution hooks, hidden sequence logic, or boiler-specific runtime semantics
- `BoilerSupervisorModes v1` and `PumpSkidSupervisorModes v1` are accepted only as authoring-level package mode / phase slices

## Wave 15 contract note
- Wave 15 adds package permissive/interlock as additive authoring metadata beside package supervision, coordination, and mode/phase
- package permissive/interlock expresses permissives, interlocks, gate summary, summary outputs, aggregate monitors, traces, and transition guards only
- package permissive/interlock must remain non-safety, package-neutral, and read-only

## Wave 15 freeze note
- Wave 15 freezes package permissive/interlock as additive authoring metadata over frozen package members
- permissive/interlock refs, gate summaries, and transition guards must resolve only to child ports and frozen package transition refs
- package permissive/interlock does not create package safety hooks, manual override semantics, or boiler-specific contract fields
- `BoilerSupervisorInterlocks v1` is reference-only and `PumpSkidSupervisorInterlocks v1` is the mandatory second acceptance slice

## Wave 16 contract note
- Wave 16 adds package protection/recovery as additive authoring metadata beside the existing package lanes
- package protection/recovery expresses trips, inhibits, protection summary, recovery requests, diagnostic summaries, summary outputs, aggregate monitors, and traces only
- package protection/recovery must remain generic, package-neutral, and explicitly non-safety

## Wave 16 freeze note
- Wave 16 freezes package protection/recovery as additive authoring metadata over frozen package members
- package protection/recovery refs must resolve only to child-owned sources and frozen child operations
- package protection/recovery does not create certified safety semantics, hidden package runtime, or vendor-specific recovery workflows
- `BoilerSupervisorProtection v1` is reference-only and `PumpSkidSupervisorProtection v1` is the mandatory second acceptance slice

## Wave 17 contract note
- Wave 17 adds package arbitration as additive authoring metadata beside the existing package lanes
- package arbitration expresses ownership lanes, ownership summary, command lanes, command summary, summary outputs, aggregate monitors, and traces only
- package arbitration must remain generic, package-neutral, and execution-neutral

## Wave 17 freeze note
- Wave 17 freezes package arbitration as additive authoring metadata over frozen package members
- ownership refs, command refs, and summary refs must resolve only to child members and explicit package lane ids
- package arbitration does not create package command execution, safety semantics, or vendor-specific command workflows
- `BoilerSupervisorArbitration v1` is reference-only and `PumpSkidSupervisorArbitration v1` is the mandatory second acceptance slice

## Wave 18 contract note
- Wave 18 adds package override/handover as additive authoring metadata beside the existing package lanes
- package override/handover expresses authority holders, handover summary, bounded handover requests, summary outputs, aggregate monitors, and traces only
- package override/handover must remain generic, package-neutral, execution-neutral, and non-safety

## Wave 18 freeze note
- Wave 18 freezes package override/handover as additive authoring metadata over frozen package members
- holder refs, request refs, and summary refs must resolve only to child members and explicit package lane ids
- package override/handover does not create package execution, backend handover transport, safety semantics, or vendor-specific ownership workflows
- `BoilerSupervisorOverrides v1` is reference-only and `PumpSkidSupervisorOverrides v1` is the mandatory second acceptance slice
