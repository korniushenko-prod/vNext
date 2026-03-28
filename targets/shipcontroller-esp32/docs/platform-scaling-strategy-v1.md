# Platform Scaling Strategy v1

## Purpose

This document fixes the long-term scaling direction of the platform so that:

- the project stays universal at the architecture level
- the firmware does not turn into one oversized binary with every feature enabled
- future satellites and test hardware fit the same roadmap instead of becoming side projects

## Core Rule

Keep:

- one shared platform
- one shared repository
- one shared config and protocol direction

Do not require:

- one monolithic firmware image with every subsystem compiled in

The intended model is:

`shared platform core + optional feature builds + future satellite firmwares`

## Current Hardware Focus

For the current mainline work:

- target board: `LilyGO T3`
- reason:
  - it already has OLED
  - it is the only fully featured test board currently available

This means:

- current main-controller work should stay centered on `LilyGO T3`
- if flash pressure grows, optional features should be disabled at compile time instead of redesigning the whole platform

Future direction:

- `LilyGO T3` remains the current integration/main target
- a future custom main board is expected later
- that later main-board migration should target a stronger main-controller class than the current `LilyGO T3`

## Firmware Strategy

### 1. Shared Core

Keep one common platform core for:

- config
- resources
- channels
- signals
- blocks
- display model
- service Web UI
- communications foundation
- shared runtime rules

### 2. Optional Feature Builds

The platform should support build profiles where optional subsystems are compiled only when needed.

Candidate feature flags:

- `FEATURE_OLED`
- `FEATURE_LORA`
- `FEATURE_MODBUS`
- `FEATURE_EXTERNAL_ADC`
- `FEATURE_EXTERNAL_DAC`
- later other optional packs

This is the preferred answer to flash pressure for product variants.

### 3. Future Satellite Firmwares

The platform should later support satellite/controller-node firmwares inside the same repository.

Typical future targets:

- `satellite_stepper`
- `satellite_remote_io`
- `satellite_sensor`

These are meant for:

- hard real-time tasks
- local actuator loops
- dense I/O expansion
- protocol edge nodes

## Recommended MCU Roles

These recommendations are now approved as the current platform direction.

### Current Main Controller

- `LilyGO T3`
- role:
  - active development main target
  - current display-integrated reference board

### Future Main Controller Direction

- future custom main board should be designed as a stronger main-controller target than the current `LilyGO T3`
- exact migration target is deferred, but the intent is:
  - more headroom than the current board
  - same platform architecture
  - optional features compiled per product profile

### Compatibility / ESP Satellite Path

- `ESP32-C3` is kept as a compatible platform target
- role:
  - ESP-family satellite/dev target
  - compatibility node for the shared platform
  - not the preferred long-term main controller

### Simple Satellite Recommendation

Preferred long-term direction for a simple custom satellite:

- `RP2040` or `STM32G0/C0`

Why:

- better value when Wi-Fi/BLE is not needed
- good fit for simple remote I/O, sensor nodes, and general support satellites

### Motion / Stepper Satellite Recommendation

Preferred long-term direction:

- `STM32G4`

Why:

- better fit for stepper/motion/feedback work
- more appropriate for deterministic local actuator control than the main controller

## Why Satellites Are Part Of The Plan

Some tasks are better handled outside the main controller:

- stepper motion with feedback
- fast pulse/timing loops
- dense remote I/O
- special analog front-ends
- protocol bridge nodes

The main controller should remain:

- logic coordinator
- UI/service endpoint
- configuration host
- signal/block engine

## Repository Direction

The intended end state is:

- one repo
- one shared protocol/types layer
- multiple PlatformIO targets/environments

Expected future structure:

- `shared/`
- `src_main/`
- `src_satellite_stepper/`
- `src_satellite_remote_io/`
- `src_satellite_sensor/`

Implementation note:

- source tree reorganization may start early
- but active feature work still stays focused on the current main-controller path until the current functional scope is finished
- early reorganization should prepare for:
  - main target
  - ESP compatibility target(s)
  - future non-ESP satellite targets

## Test Bench Direction

After the current main functional scope and a full UI review are complete, the next major hardware phase should include:

- a dedicated main-controller test bench
- future satellite targets

The test bench should validate:

- digital input/output logic
- analog conditioning
- timing and response latency
- feedback correctness
- communication behavior
- failure and recovery cases

## Current Priority Rule

Do now:

- continue current main-controller feature completion on `LilyGO T3`
- use compile-time feature reduction if flash becomes tight
- keep writing code as one platform, not as one bloated binary
- document and prepare multi-target structure
- keep `ESP32-C3` as the first compatibility/satellite ESP target for now

Do later:

- full satellite firmware targets
- dedicated test bench board
- deeper repo split by target
- custom main board migration

## Transition Trigger

Move seriously into:

- satellites
- test bench hardware
- deeper repo reorganization

only after:

- the current main-controller functional set is complete enough
- a full UI revision pass is done
- the current `LilyGO T3` target is stable enough to serve as the reference main build
