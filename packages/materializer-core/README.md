# @universal-plc/materializer-core

Canonical materializer core for transforming the authoring `ProjectModel`
into a target-neutral `RuntimePack`.

## Scope
- normalize project input
- resolve local `type_ref`
- resolve authoring `template_ref` into ordinary effective instance values
- build effective runtime instances
- expand `system.signals` into normalized point-to-point runtime connections
- expand `composition.routes` recursively
- resolve params into final runtime values
- emit diagnostics and a target-neutral `RuntimePack`

## Non-goals
- no UI/editor logic
- no ESP32 or target-specific emission
- no execution scheduling
- no State/Flow execution logic
- no live apply/deploy logic
- no template-specific runtime kinds or template-specific runtime identity

## Pipeline
1. structural validation of `ProjectModel`
2. normalize project shape
3. build type registry
4. materialize system instances
5. materialize system signals
6. expand composition recursively
7. finalize `RuntimePack`

## Package boundaries
- imports from `@universal-plc/project-schema`
- imports from `@universal-plc/runtime-pack-schema`
- does **not** import from UI, `targets/*`, or legacy runtime code

## Template invariance rule
- `template_ref` is authoring-only input
- template defaults are folded into the effective instance during materialization
- `RuntimePack` must not contain `template_ref`, `template_id`, or `template_kind`
- explicit and template-based instances with the same effective values must materialize to the same pack

## Operations spine rule
- `materializer-core` emits `RuntimePack.operations` as target-neutral operation metadata
- operation ids remain stable and qualified by instance scope
- `operation_runtime_contract` is emitted as runtime capability metadata only
- materialization does not introduce execution handlers or target-imperative hooks

## Wave 8 freeze note
- Wave 8 does not turn `materializer-core` into an execution engine
- runnable baseline kinds remain frozen as `reset_totalizer`, `reset_counter`, and `reset_interval`
- `PID autotune` remains metadata-only here and does not gain target-specific execution semantics

## Wave 9 freeze note
- `materializer-core` now canonically emits runnable `PID autotune` metadata in `RuntimePack.operations`
- emitted autotune execution metadata stays target-neutral and contract-aligned
- `operation_runtime_contract` becomes execution-capable only when the effective pack includes runnable autotune metadata
- materialization still does not perform execution, polling, target hooks, or apply/reject side effects

## Wave 10 freeze note
- packages remain authoring-only input to materialization
- `materializer-core` flattens package members into ordinary effective instances, connections, monitors, operations, and resources
- `RuntimePack` must stay package-execution-neutral: no `package_kind` or package execution identity is emitted
- explicit-expanded and package-based projects with the same effective values must materialize to the same effective pack

## Wave 11 package supervision note
- package supervision is emitted only as target-neutral package metadata in `RuntimePack.package_supervision`
- package summary outputs, aggregate monitors or alarms, trace groups, and operation proxies must be derived from flattened child objects
- package supervision does not create package runtime execution logic, hidden child operations, or target-specific hooks

## Wave 11 freeze note
- Wave 11 freezes `RuntimePack.package_supervision` as the canonical materialized form of package supervision
- package supervision remains summary/proxy metadata only and stays derived from flattened child runtime objects
- materialization does not introduce package execution identity, package backend hooks, or package-specific imperative behavior

## Wave 12 package coordination note
- package coordination is emitted only as target-neutral package metadata in `RuntimePack.package_coordination`
- package state summaries, aggregate monitors, traces, and proxy operations must be derived from flattened child objects and already materialized child operations
- package coordination does not create package runtime execution logic, hidden child acquisition, or target-specific hooks

## Wave 12 freeze note
- Wave 12 freezes `RuntimePack.package_coordination` as the canonical materialized form of package coordination
- package coordination remains summary/proxy metadata only and stays derived from flattened child runtime objects and child operation ids
- materialization does not introduce package execution identity, package backend hooks, or package-specific imperative behavior

## Wave 13 package mode / phase note
- package mode / phase is emitted only as target-neutral package metadata in `RuntimePack.package_mode_phase`
- package mode, phase, summary, group, and trace refs must be derived from flattened child objects
- package mode / phase does not create package runtime execution logic, hidden sequencing, or target-specific hooks

## Wave 13 freeze note
- Wave 13 freezes `RuntimePack.package_mode_phase` as the canonical materialized form of package mode / phase metadata
- package mode / phase remains summary metadata only and stays derived from flattened child runtime objects
- materialization does not introduce package execution identity, backend hooks, or package-specific imperative sequencing

## Wave 14 package mode execution note
- bounded package transition metadata is emitted only as target-neutral package execution metadata in `RuntimePack.package_mode_runtime_contract` and `RuntimePack.package_mode_phase`
- allowed transition refs, guard notes, and synthetic phase/transition state stay derived from package authoring metadata and flattened child refs
- materialization does not introduce package execution handlers, child imperative hooks, or full sequence runtime

## Wave 14 freeze note
- Wave 14 freezes bounded package mode / phase execution as additive runtime metadata only
- materialized package execution remains package-neutral and dual-domain compatible across boiler-like and non-boiler slices
- materialization still does not perform execution, scheduling, or vendor-specific package logic

## Wave 15 package permissive/interlock note
- package permissive/interlock is emitted only as target-neutral package metadata in `RuntimePack.package_permissive_interlock`
- package gating refs, summaries, monitors, traces, and transition guards must be derived from flattened child objects and frozen package transition refs
- materialization does not introduce package safety logic, override semantics, or target-specific package hooks

## Wave 15 freeze note
- Wave 15 freezes `RuntimePack.package_permissive_interlock` as the canonical materialized form of package gating metadata
- package permissive/interlock remains read-only, package-neutral metadata only and stays derived from flattened child runtime objects
- materialization does not introduce package safety runtime, backend hooks, or domain-specific imperative behavior

## Wave 16 package protection/recovery note
- package protection/recovery is emitted only as target-neutral package metadata in `RuntimePack.package_protection_recovery`
- package trip, inhibit, summary, and recovery refs must be derived from flattened child objects and frozen child operations
- materialization does not introduce package safety runtime, hidden recovery engine, or target-specific hooks

## Wave 16 freeze note
- Wave 16 freezes `RuntimePack.package_protection_recovery` as the canonical materialized form of package protection/recovery metadata
- package protection/recovery remains generic, package-neutral, and non-safety metadata only
- materialization stays limited to flattening child-owned protection sources and recovery requests

## Wave 17 package arbitration note
- package arbitration is emitted only as target-neutral package metadata in `RuntimePack.package_arbitration`
- ownership lanes, command lanes, summaries, monitors, and traces must be derived from flattened child objects and explicit package lane refs
- materialization does not introduce package command execution, backend transport, or target-specific arbitration hooks

## Wave 17 freeze note
- Wave 17 freezes `RuntimePack.package_arbitration` as the canonical materialized form of package arbitration metadata
- package arbitration remains generic, package-neutral, and execution-neutral metadata only
- materialization stays limited to flattening child-owned arbitration sources and explicit command lane outcomes

## Wave 18 package override/handover note
- package override/handover is emitted only as target-neutral package metadata in `RuntimePack.package_override_handover`
- authority holders, handover requests, summaries, monitors, and traces must be derived from flattened child objects and explicit package lane refs
- materialization does not introduce package handover execution, backend transport, or target-specific ownership hooks

## Wave 18 freeze note
- Wave 18 freezes `RuntimePack.package_override_handover` as the canonical materialized form of package override/handover metadata
- package override/handover remains generic, package-neutral, execution-neutral, and non-safety metadata only
- materialization stays limited to flattening child-owned holder/request sources and explicit bounded handover outcomes

## Pilot track note
- `PumpSkidSupervisor v1` is the first accepted product-track pilot package
- `materializer-core` must flatten the pilot package into ordinary runtime instances, resources, operations, and package metadata without opening a new generic package runtime model
- pilot-specific templates, presets, and helper members are accepted only insofar as they still materialize into a package-neutral `RuntimePack`

## First accepted fixtures
- `empty-project.json`
- `timed-relay.project.json`
- `boiler-composition.project.json`
- `invalid-missing-type.project.json`
