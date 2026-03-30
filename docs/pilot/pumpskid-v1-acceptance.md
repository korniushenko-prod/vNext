# PumpSkid v1 Acceptance

## Required Positive Path

1. open or create the pilot project
2. select a package preset/template baseline
3. review package parameters and bench bindings
4. materialize the project into a runtime pack
5. validate ESP32 compatibility
6. emit a deterministic ShipController artifact
7. apply the configuration to the target baseline
8. collect readback
9. open the commissioning surface
10. verify mode, running, fault, readiness, and service summaries
11. execute one bounded baseline operation

## Required Negative Coverage

- missing hardware binding
- unsupported target profile
- apply failure
- stale or no readback
- mismatch between expected state and readback state

## Canonical Assets

- `pump-skid-supervisor.project.e2e.json`
- `pump-skid-supervisor.runtime-pack.snapshot.json`
- `pump-skid-supervisor.shipcontroller-artifact.json`
- `pump-skid-supervisor.readback.snapshot.json`
- `pump-skid-supervisor.package-overview.fixture.json`
- `pump-skid-supervisor.commissioning.fixture.json`

## Verification Track Outputs

- `pumpskid-v1-verification-matrix.md`
- `pumpskid-v1-verification-scenarios.md`
- `pumpskid-v1-acceptance-checklist.md`
- `pumpskid-v1-issue-severity-rubric.md`
- `pumpskid-v1-commissioning-walkthrough.md`
- `pumpskid-v1-soak-degraded.md`
- `pumpskid-v1-acceptance-review.md`

## Acceptance Rule

The pilot is accepted only when the package is usable as a bounded
production-like node without requiring raw JSON inspection to understand target
state, package health, or apply/readback status.
