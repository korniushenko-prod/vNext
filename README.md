# vNext

Single integration repository for the next-generation universal PLC platform.

## Product Split

- `universal_plc`: editor/model/authoring/materializer base
- `ShipController`: runtime/hardware/target execution base

## Current State

The initial foundation phase is closed. The repository now contains:

- frozen generic platform baselines through `Wave 18`
- frozen pilot MVP `PumpSkidSupervisor v1`
- frozen verification, sign-off, and controlled-rollout repo bundle
- one active external track for real bench validation

Canonical snapshot:
- [Current State Snapshot](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\merge\current-state-snapshot.md)
- [Machine-First Goal And Version Roadmap](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\merge\machine-first-goal-and-version-roadmap-v1.md)

## Active Track

Active track marker:
- `PR-35A — Controlled Pilot Bench Execution`

Current rule:

- do not open a new wave
- do not reopen foundation
- do not expand package/library scope
- only close real bench deploy/apply/readback/reboot/persistence/operator evidence for the frozen controlled pilot bundle

Forward planning note:

- historical Waves 5 through 18 remain frozen implementation history
- forward product language is now rebased around the machine-first roadmap in [Machine-First Goal And Version Roadmap](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\merge\machine-first-goal-and-version-roadmap-v1.md)
- the active bench track remains the only execution track until `PR-35A` is closed

Primary references for the active track:

- [Controlled Pilot Scope](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\pilot\controlled-pilot-scope.md)
- [Controlled Pilot Acceptance Gates](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\pilot\controlled-pilot-acceptance-gates.md)
- [Controlled Pilot Environment Manifest](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\pilot\controlled-pilot-environment-manifest.md)
- [Controlled Pilot Harness](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\pilot\pumpskid-v1-deploy-apply-readback-harness.md)

## Primary Directories

- `docs`
- `apps`
- `packages`
- `targets`
- `tools`
- `tests`
