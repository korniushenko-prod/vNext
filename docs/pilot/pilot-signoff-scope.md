# Pilot Sign-off Scope

## Purpose

This document freezes the final sign-off / controlled rollout track for the
already-frozen `PumpSkidSupervisor v1` pilot MVP.

It does not open a new platform wave and does not reopen the pilot baseline.

## In Scope

- sign-off scope and acceptance gates
- physical/manual evidence package inventory
- bench deploy / apply / readback review
- reboot / persistence review
- operator-guided commissioning review
- controlled rollout readiness decision
- final sign-off freeze report

## Out of Scope

- new shared contracts
- new library objects
- target/runtime redesign
- UI redesign
- new package capabilities
- protocol expansion
- boiler/vendor-specific expansion

## Source of Truth

- canonical pilot project:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json`
- canonical runtime pack:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.runtime-pack.snapshot.json`
- canonical target artifact:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.shipcontroller-artifact.json`
- canonical readback:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.readback.snapshot.json`
- canonical commissioning fixture:
  `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.commissioning.fixture.json`

## Allowed Fix Class

Only the following may be accepted during sign-off:
- test harness fixes
- fixture synchronization
- documentation corrections
- verification-only wrappers

Anything else must be called out explicitly as:
- `pilot-blocking fix`
- or deferred to the post-pilot backlog
