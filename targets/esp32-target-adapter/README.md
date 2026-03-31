# @universal-plc/esp32-target-adapter

Offline target adapter baseline for the ShipController / ESP32 family.

## Scope
- accepts only `RuntimePack`
- exposes capability profile
- performs target-side compatibility checks
- builds deterministic apply plans
- provides a factory for the adapter contract wrapper

## Implemented in PR-12A / PR-12B
- offline adapter contract wrapper
- stable ESP32 capability profile
- deterministic compatibility checker
- deterministic apply-plan builder
- stable diagnostic codes for target compatibility failures

## Implemented in PR-12C
- deterministic offline ShipController-shaped config artifact emitter
- stable artifact meta block
- deterministic ordering for instances, connections, and resources
- explicit unresolved native execution placeholder block

## Implemented in PR-13C / PR-14C
- pulse flowmeter compatibility checks and deterministic artifact emission
- PID controller compatibility checks and deterministic artifact emission
- end-to-end coverage for `TimedRelay`, `PulseFlowmeter`, and `PIDController`

## Non-goals in this phase
- no UI logic
- no legacy editor integration
- no ShipController runtime code import
- no live deploy
- no ESP32 transport
- no runtime merge
- no package execution engine

## Current contract surface
- `esp32CapabilityProfile`
- `checkEsp32Compatibility()`
- `buildEsp32ApplyPlan()`
- `createEsp32TargetAdapter()`
- `emitShipControllerConfigArtifact()`

## Notes
- `apply()` is intentionally a controlled stub in this phase
- `readback()` is intentionally an unsupported stub in this phase
- deterministic ShipController artifact emission lands in PR-12C
- flowmeter and PID target emission are now part of the offline emitter surface
- adapter accepts only `RuntimePack`
- Wave 6 freezes operations support as metadata-only
- capability profile, readback snapshots, and artifacts understand the operations spine
- no real operation execution is implemented on the ESP32 baseline
- PR-20B opens only the generic execution baseline contract surface for `reset_totalizer`, `reset_counter`, and `reset_interval`
- execution baseline support remains synthetic and offline-only

## Wave 9 note
- `PID autotune` is now accepted as a specialized runnable adapter path on top of the frozen Wave 8 reset baseline
- autotune support remains synthetic, offline-only, and contract-driven
- adapter artifacts expose deterministic autotune execution metadata, progress payload summaries, and recommendation lifecycle summaries
- no real tuning algorithm, no boiler-specific semantics, and no shared-package changes are introduced here

## Wave 9 freeze note
- Wave 9 is frozen here as a specialized PID autotune layer, not as a new generic execution baseline
- runnable reset kinds remain exactly `reset_totalizer`, `reset_counter`, and `reset_interval`
- `pid_autotune` remains the only specialized runnable lane opened by this wave
- support stays synthetic, offline-only, and contract-driven in this baseline

## Wave 8 freeze note
- Wave 8 is frozen here as a generic execution baseline, not a PID-specific phase
- runnable baseline kinds remain exactly `reset_totalizer`, `reset_counter`, and `reset_interval`
- execution support stays synthetic, contract-driven, and offline-only
- `PID autotune` baseline changes open only in Wave 9 and stay outside the Wave 8 freeze

## Wave 10 freeze note
- package-derived runtime packs are accepted only after they flatten into ordinary runtime objects and resources
- emitted ShipController artifacts stay package-neutral: no package-specific target section is introduced
- `BoilerPackageSkeleton v1` is accepted only as a supervisory skeleton and does not imply burner-management or safety execution
- adapter support remains offline, synthetic, and contract-driven with no package execution engine

## Wave 11 note
- package supervision metadata is accepted only after package flattening and only as target-facing summary metadata
- emitted artifacts may now include deterministic `package_supervision` summaries without introducing package execution semantics
- package operation proxies remain metadata and service-surface hooks over already materialized child operations
- no burner safety logic, vendor-specific boiler sections, or package-specific imperative runtime are introduced here

## Wave 11 freeze note
- Wave 11 freezes package supervision support as deterministic, offline-only summary metadata in the ShipController artifact
- package supervision remains proxy metadata over child runtime objects and child operations; it does not become a package execution engine
- adapter support stays synthetic, contract-driven, and boiler-safety-neutral in this baseline

## Wave 12 note
- package coordination metadata is accepted only after package flattening and only as target-facing package state/proxy metadata
- emitted artifacts may now include deterministic `package_coordination` summaries without introducing package execution semantics
- package coordination proxy operations remain metadata over already materialized child operation lanes
- no burner safety logic, vendor-specific boiler sections, or package-specific imperative runtime are introduced here

## Wave 12 freeze note
- Wave 12 freezes package coordination support as deterministic, offline-only package metadata in the ShipController artifact
- package coordination remains proxy/state metadata over child runtime objects and child operations; it does not become a package execution engine
- adapter support stays synthetic, contract-driven, and boiler-safety-neutral in this baseline

## Wave 13 note
- package mode / phase metadata is accepted only after package flattening and only as target-facing package summary metadata
- emitted artifacts may now include deterministic `package_mode_phase` summaries without introducing package execution or sequence semantics
- no burner safety logic, vendor-specific boiler sections, or package-specific imperative runtime are introduced here

## Wave 13 freeze note
- Wave 13 freezes package mode / phase support as deterministic, offline-only package metadata in the ShipController artifact
- package mode / phase remains summary metadata over child runtime objects; it does not become a package execution engine or hidden sequence runtime
- adapter support stays synthetic, contract-driven, and domain-neutral across both boiler-like and non-boiler reference slices

## Wave 14 note
- bounded package mode / phase execution is accepted only after package flattening and only as generic transition metadata
- capability profile, compatibility diagnostics, synthetic package transition invoke surface, and deterministic artifacts may now describe `request_mode_change`, `request_phase_start`, and `request_phase_abort`
- no real package execution, no full sequence runtime, and no burner-specific target sections are introduced here

## Wave 14 freeze note
- Wave 14 freezes the first bounded package mode / phase execution baseline in the ESP32 adapter
- support remains synthetic, offline-only, contract-driven, and package-neutral across both boiler-like and non-boiler reference slices
- package transition execution does not open child imperative hooks, vendor-specific boiler logic, or hidden sequence runtime

## Wave 15 note
- package permissive/interlock metadata is accepted only after package flattening and only as target-facing package gate metadata
- emitted artifacts may now include deterministic `package_permissive_interlock` summaries without introducing package execution or safety runtime
- synthetic package gate snapshots remain read-only and contract-driven only

## Wave 15 freeze note
- Wave 15 freezes package permissive/interlock support as deterministic, offline-only package gate metadata in the ShipController artifact
- package gating remains read-only, package-neutral, and non-safety across both boiler-like and non-boiler reference slices
- adapter support stays synthetic, contract-driven, and does not imply manual override workflows or safety execution

## Wave 16 note
- package protection/recovery metadata is accepted only after package flattening and only as target-facing package protection summary metadata
- emitted artifacts may now include deterministic `package_protection_recovery` summaries without introducing package execution or safety runtime
- synthetic package protection/recovery snapshots remain read-only and contract-driven only

## Wave 16 freeze note
- Wave 16 freezes package protection/recovery support as deterministic, offline-only package protection metadata in the ShipController artifact
- package protection/recovery remains generic, non-safety metadata over child runtime objects across both accepted reference domains
- adapter support stays synthetic, contract-driven, and does not imply recovery workflow transport or safety execution

## Wave 17 note
- package arbitration metadata is accepted only after package flattening and only as target-facing package ownership/command summary metadata
- emitted artifacts may now include deterministic `package_arbitration` summaries without introducing package command execution runtime
- synthetic package arbitration snapshots remain read-only and contract-driven only

## Wave 17 freeze note
- Wave 17 freezes package arbitration support as deterministic, offline-only package ownership/command metadata in the ShipController artifact
- package arbitration remains generic, package-neutral, and execution-neutral across both accepted reference domains
- adapter support stays synthetic, contract-driven, and does not imply command transport, safety runtime, or vendor-specific arbitration hooks

## Wave 18 note
- package override/handover metadata is accepted only after package flattening and only as target-facing package holder/request summary metadata
- emitted artifacts may now include deterministic `package_override_handover` summaries without introducing package handover execution runtime
- synthetic package override/handover snapshots remain read-only and contract-driven only

## Wave 18 freeze note
- Wave 18 freezes package override/handover support as deterministic, offline-only package holder/request metadata in the ShipController artifact
- package override/handover remains generic, package-neutral, execution-neutral, and non-safety across both accepted reference domains
- adapter support stays synthetic, contract-driven, and does not imply handover transport, safety runtime, or vendor-specific override hooks

## Pilot track note
- `PumpSkidSupervisor v1` is the first accepted product-track pilot package on this adapter
- `apply()` and `readback()` now expose a bounded, stateful pilot baseline when `options.runtime_pack` or `options.pack_snapshot` is provided during apply
- the pilot baseline adds config checksum/version echo, deterministic package-level readback summaries, and commissioning-facing state without opening a broad transport redesign
- this remains bounded to the pilot path and does not imply OTA, cloud deploy, or generic live target orchestration

## Hardware preset note
- the adapter accepts materializer-local `hardware_resolution` metadata for the frozen preset lane only
- accepted presets remain exactly `lilygo_t3_v1_6_1_oled_lora_builtin_led` and `esp32_c3_super_mini_minimal`
- emitted ShipController artifacts may include deterministic `hardware` summaries derived from resolved preset resources
- this support stays target-facing and offline-only: no UI hardware editor, no display/Wi-Fi runtime drift, and no new transport layer are introduced here
