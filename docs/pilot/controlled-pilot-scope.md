# Controlled Pilot Scope

## Purpose

This document freezes the controlled pilot rollout track for the already-frozen
`PumpSkidSupervisor v1` pilot MVP.

This track is operational and evidence-oriented. It does not reopen the pilot
baseline and does not start a new platform wave.

## In Scope

- one canonical controlled pilot bundle
- one canonical target artifact and readback package
- repeatable deploy / apply / readback harness
- reboot / persistence review against the frozen pilot baseline
- operator-guided commissioning walkthrough and friction capture
- evidence closure and explicit rollout decision
- controlled pilot freeze report

## Out Of Scope

- new shared contracts
- new library objects
- materializer or target redesign
- new UI surfaces beyond rollout bugfix/documentation use
- protocol expansion
- boiler/domain expansion
- post-pilot feature work

## Canonical Bundle

- project:
  `docs/pilot/pumpskid-v1-controlled-pilot.project.json`
- target artifact:
  `docs/pilot/pumpskid-v1-controlled-pilot.artifact.json`
- readback package:
  `docs/pilot/pumpskid-v1-controlled-pilot.readback.json`
- commissioning fixture:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.commissioning.fixture.json`
- package overview fixture:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.package-overview.fixture.json`

## Allowed Fix Class

Only the following may be accepted inside the rollout track:

- harness fixes
- fixture synchronization
- documentation corrections
- evidence-bundle bookkeeping
- explicit bugfix-only wrappers needed to keep the frozen pilot path reproducible

Everything else is out of scope and must be tracked as post-rollout work.

## Explicit Blockers

The rollout must be held if any of the following happens:

- canonical project and emitted artifact drift without an approved pilot bugfix
- apply/readback stops being deterministic
- reboot/persistence contradict the frozen pilot baseline
- commissioning requires raw source/JSON inspection to complete basic tasks
- live bench evidence contradicts the canonical bundle and cannot be explained as operator error

## Freeze Note

Any new product/platform feature work is forbidden inside this rollout track.
Controlled pilot only validates the frozen `PumpSkidSupervisor v1` path.
