# @universal-plc/runtime-pack-schema

Canonical schema for materialized runtime packs emitted from the authoring model.

## Scope
- normalized runtime pack types
- structural validation for runtime pack shape
- fixtures for flattened execution-ready connection graphs
- runtime-neutral operations spine contracts

## Non-goals
- no editor/UI contracts
- no authoring `signals`
- no target-specific ESP32 details
- no materializer implementation
- no operation execution logic

## Canonical rules
- runtime pack is `instances + connections`, not `signals`
- runtime connections are one-source-to-one-target normalized links
- params are resolved values, not parent bindings
- runtime pack may carry target-neutral resource bindings
- runtime operations are target-neutral contracts, not target-specific execution hooks
- runtime packs stay template-neutral and target-neutral

## Wave 6 freeze note
- Wave 6 freezes the operations spine as metadata-first and additive-only
- `RuntimePack.operations` is the canonical materialized operation layer
- `operation_runtime_contract` does not claim execution is implemented
- `PID autotune` remains metadata-only on this baseline

## Wave 8 freeze note
- Wave 8 freezes the generic execution baseline over this contract layer
- runnable baseline kinds stay frozen here as `reset_totalizer`, `reset_counter`, and `reset_interval`
- confirmation token validation, failure payload vocabulary, and audit hook skeleton remain additive-only contract fields
- no execution backend is implied by these fields
- `PID autotune` remains metadata-only on the frozen Wave 8 baseline

## Wave 9 freeze note
- Wave 9 freezes `pid_autotune` as the only specialized runnable lane opened on top of the generic operations baseline
- recommendation lifecycle, apply/reject confirmation semantics, and progress payload shape are now canonical shared contract vocabulary for that slice
- this package still does not imply materialization logic, target execution behavior, or UI wizard behavior

## Wave 12 contract note
- Wave 12 adds `package_coordination` as additive runtime metadata beside `package_supervision`
- package coordination stays package-neutral and metadata-first in `RuntimePack`
- package-level operation proxies must still resolve to already materialized child operations

## Wave 12 freeze note
- Wave 12 freezes `RuntimePack.package_coordination` as the canonical runtime form of package coordination
- package coordination remains target-neutral summary/proxy metadata only and stays derived from flattened child runtime objects
- package coordination does not imply package execution semantics, safety behavior, or boiler-specific target hooks

## Wave 13 contract note
- Wave 13 adds `package_mode_phase` as additive runtime metadata beside `package_supervision` and `package_coordination`
- package mode / phase stays package-neutral and metadata-first in `RuntimePack`
- package mode / phase summarizes active refs, summaries, groups, and traces only

## Wave 13 freeze note
- Wave 13 freezes `RuntimePack.package_mode_phase` as the canonical runtime form of package mode / phase metadata
- package mode / phase remains target-neutral summary metadata only and stays derived from flattened child runtime objects
- package mode / phase does not imply package execution semantics, hidden sequencing, or boiler-specific target hooks

## Wave 14 contract note
- Wave 14 adds `package_mode_runtime_contract` plus bounded transition metadata inside `RuntimePack.package_mode_phase`
- allowed package transition intents stay frozen here as `request_mode_change`, `request_phase_start`, and `request_phase_abort`
- package mode execution remains package-neutral metadata over child-owned lanes and does not open full sequence runtime

## Wave 14 freeze note
- Wave 14 freezes the first bounded package mode / phase execution baseline in shared runtime vocabulary
- dual-domain acceptance stays mandatory: one boiler-like slice and one non-boiler slice
- package mode execution remains bounded, synthetic-capable, and package-neutral; it does not imply vendor-specific sequencing or safety runtime

## Wave 15 contract note
- Wave 15 adds `package_permissive_interlock` as additive runtime metadata beside the existing package lanes
- package gating stays package-neutral and metadata-first in `RuntimePack`
- gate summaries, reason refs, and transition guards must remain non-safety runtime vocabulary only

## Wave 15 freeze note
- Wave 15 freezes `RuntimePack.package_permissive_interlock` as the canonical runtime form of package gating metadata
- package permissive/interlock remains read-only, target-neutral, and derived from flattened child runtime objects
- package gating does not imply safety runtime, operator override workflow, or boiler-specific target hooks

## Wave 16 contract note
- Wave 16 adds `package_protection_recovery` as additive runtime metadata beside the existing package lanes
- package protection/recovery carries trips, inhibits, protection summary, recovery requests, summary outputs, aggregate monitors, and traces only
- package protection/recovery remains package-neutral runtime metadata derived from flattened child runtime objects

## Wave 16 freeze note
- Wave 16 freezes `RuntimePack.package_protection_recovery` as the canonical runtime form of package protection/recovery metadata
- package protection/recovery remains generic, non-safety, and target-neutral
- package protection/recovery does not imply certified safety runtime, package execution hooks, or vendor-specific recovery logic

## Wave 17 contract note
- Wave 17 adds `package_arbitration` as additive runtime metadata beside the existing package lanes
- package arbitration carries ownership lanes, ownership summary, command lanes, command summary, summary outputs, aggregate monitors, and traces only
- package arbitration remains package-neutral runtime metadata derived from flattened child runtime objects

## Wave 17 freeze note
- Wave 17 freezes `RuntimePack.package_arbitration` as the canonical runtime form of package arbitration metadata
- package arbitration remains generic, package-neutral, and execution-neutral
- package arbitration does not imply package command execution hooks, backend transport, or vendor-specific arbitration logic

## Wave 18 contract note
- Wave 18 adds `package_override_handover` as additive runtime metadata beside the existing package lanes
- package override/handover carries authority holders, handover summary, bounded handover requests, summary outputs, aggregate monitors, and traces only
- package override/handover remains package-neutral runtime metadata derived from flattened child runtime objects

## Wave 18 freeze note
- Wave 18 freezes `RuntimePack.package_override_handover` as the canonical runtime form of package override/handover metadata
- package override/handover remains generic, package-neutral, execution-neutral, and non-safety
- package override/handover does not imply package execution hooks, backend handover transport, or vendor-specific ownership logic
