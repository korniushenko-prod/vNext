# @universal-plc/target-adapter-contracts

Canonical contracts between materialized runtime packs and target adapters.

## Scope
- target adapter manifest
- deployment request/result contracts
- readback contracts
- generic operations runtime spine contracts
- structural validation and fixtures

## Non-goals
- no materializer logic
- no target-specific firmware/runtime implementation
- no editor or authoring model
- no operation execution logic or service/UI lifecycle

## Canonical rule
This package defines the boundary *after* materialization and *before* target-specific execution.

## Operations spine rule
- operation invoke/cancel/readback contracts are generic and target-neutral
- operation snapshots carry state/progress/result shape only
- capability declarations may describe operation support, but do not implement it

## Wave 6 freeze note
- Wave 6 freezes these contracts as the generic operations boundary after materialization
- invoke/cancel/readback contracts are not a PID-specific execution feature
- target contracts stay execution-neutral until a later wave explicitly opens runtime execution

## Wave 8 freeze note
- Wave 8 freezes the generic execution baseline over this contract layer
- execution baseline kinds stay frozen here as `reset_totalizer`, `reset_counter`, and `reset_interval`
- confirmation token validation, failure payload shape, and audit hook skeleton remain additive-only
- no target execution implementation is implied by these fields
- `PID autotune` remains metadata-only on the frozen Wave 8 baseline

## Wave 9 freeze note
- Wave 9 freezes additive target-facing contract vocabulary for runnable `pid_autotune` only
- invoke requests may describe apply/reject recommendation actions for the specialized autotune lane
- snapshots and invoke results may carry progress payload and recommendation state fields for that lane
- these contracts still do not imply a real target-side tuning algorithm by themselves

## Wave 12 contract note
- Wave 12 adds additive package coordination support/profile and readback snapshot vocabulary
- package coordination stays a target-facing metadata layer only
- package coordination must not imply a package execution engine or burner-specific target semantics

## Wave 12 freeze note
- Wave 12 freezes package coordination as additive target-facing summary/proxy vocabulary only
- capability profiles, readback snapshots, and deterministic artifacts may describe package coordination support, but do not implement package execution
- package coordination does not imply burner-specific target sections or package backend transport semantics

## Wave 13 contract note
- Wave 13 adds additive package mode / phase support/profile and readback snapshot vocabulary
- package mode / phase stays a target-facing metadata layer only
- package mode / phase must not imply a package execution engine or hidden sequencing semantics

## Wave 13 freeze note
- Wave 13 freezes package mode / phase as additive target-facing summary vocabulary only
- capability profiles, readback snapshots, and deterministic artifacts may describe package mode / phase support, but do not implement package execution or sequence runtimes
- package mode / phase does not imply boiler-specific target sections or package backend transport semantics

## Wave 14 contract note
- Wave 14 adds additive target-facing contract vocabulary for bounded package mode / phase execution
- package transition requests stay frozen here as `request_mode_change`, `request_phase_start`, and `request_phase_abort`
- package mode execution snapshots may describe transition state, guard state, and phase state only; they do not imply a package sequence engine

## Wave 14 freeze note
- Wave 14 freezes bounded package mode / phase execution as generic, target-facing contract vocabulary only
- capability profiles, synthetic snapshots, and deterministic artifacts may describe bounded package transition support, but do not implement real package execution runtime
- boiler-like acceptance remains reference-only and non-boiler acceptance remains mandatory

## Wave 15 contract note
- Wave 15 adds additive package permissive/interlock support/profile and readback snapshot vocabulary
- package gating stays a target-facing metadata layer only
- package permissive/interlock must not imply safety runtime, override workflow, or boiler-specific target semantics

## Wave 15 freeze note
- Wave 15 freezes package permissive/interlock as additive target-facing gating vocabulary only
- capability profiles, synthetic snapshots, and deterministic artifacts may describe package gate support, but do not implement safety or package execution runtime
- boiler-like acceptance remains reference-only and non-boiler acceptance remains mandatory

## Wave 16 contract note
- Wave 16 adds additive package protection/recovery support/profile and readback snapshot vocabulary
- package protection/recovery snapshots may describe protection summary, trip states, inhibit states, and recovery request availability only
- package protection/recovery must not imply safety runtime, vendor-specific protection hooks, or hidden package execution

## Wave 16 freeze note
- Wave 16 freezes package protection/recovery as additive target-facing protection summary vocabulary only
- capability profiles, synthetic snapshots, and deterministic artifacts may describe package protection/recovery support, but do not implement safety execution runtime
- boiler-like acceptance remains reference-only and non-boiler acceptance remains mandatory

## Wave 17 contract note
- Wave 17 adds additive package arbitration support/profile and readback snapshot vocabulary
- package arbitration snapshots may describe ownership summary, command summary, and per-lane arbitration states only
- package arbitration must not imply package command execution runtime or vendor-specific transport hooks

## Wave 17 freeze note
- Wave 17 freezes package arbitration as additive target-facing arbitration vocabulary only
- capability profiles, synthetic snapshots, and deterministic artifacts may describe package arbitration support, but do not implement package command execution
- boiler-like acceptance remains reference-only and non-boiler acceptance remains mandatory

## Wave 18 contract note
- Wave 18 adds additive package override/handover support/profile and readback snapshot vocabulary
- package override/handover snapshots may describe authority holder visibility, handover summary, and bounded request states only
- package override/handover must not imply package execution runtime, backend handover transport, or vendor-specific ownership hooks

## Wave 18 freeze note
- Wave 18 freezes package override/handover as additive target-facing holder/request vocabulary only
- capability profiles, synthetic snapshots, and deterministic artifacts may describe package override/handover support, but do not implement package handover execution
- boiler-like acceptance remains reference-only and non-boiler acceptance remains mandatory
