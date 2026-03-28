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

## Non-goals in this phase
- no UI logic
- no legacy editor integration
- no ShipController runtime code import
- no live deploy
- no ESP32 transport
- no runtime merge
- no boiler package
- no PID / flowmeter emission

## Current contract surface
- `esp32CapabilityProfile`
- `checkEsp32Compatibility()`
- `buildEsp32ApplyPlan()`
- `createEsp32TargetAdapter()`

## Notes
- `apply()` is intentionally a controlled stub in this phase
- `readback()` is intentionally an unsupported stub in this phase
- deterministic ShipController artifact emission lands in PR-12C
- adapter accepts only `RuntimePack`