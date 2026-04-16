# Current State Snapshot

## Repository Status

`vNext` is no longer in the initial foundation phase.

The repository currently contains:

- frozen generic platform waves through `Wave 18`
- frozen bounded hardware preset / target catalog track
- frozen product-track pilot MVP `PumpSkidSupervisor v1`
- frozen verification, sign-off, and controlled-rollout repo bundle for that pilot
- one completed bounded bench confirmation track for physical proof

## Frozen Baselines

- Wave 5: templates / saved configured objects
- Wave 6: generic operations runtime spine
- Wave 7: UI / service lifecycle
- Wave 8: generic execution baseline
- Wave 9: PID autotune execution
- Wave 10: package skeleton baseline
- Wave 11: package supervision
- Wave 12: package coordination
- Wave 13: package mode / phase
- Wave 14: package mode execution
- Wave 15: package permissive / interlock
- Wave 16: package protection / recovery
- Wave 17: package arbitration
- Wave 18: package override / handover
- Hardware catalog track: authoring-only preset/catalog baseline for LilyGO T3 and ESP32-C3

## Pilot Track Status

- pilot MVP frozen:
  `PumpSkidSupervisor v1`
- verification track frozen
- sign-off / controlled rollout repo track frozen
- controlled pilot bundle is prepared in repo
- bounded physical bench evidence is now confirmed

Canonical pilot references:

- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json`
- `docs/pilot/pumpskid-v1-controlled-pilot.project.json`
- `docs/pilot/pumpskid-v1-controlled-pilot.artifact.json`
- `docs/pilot/pumpskid-v1-controlled-pilot.readback.json`

## Active Track Marker

Completed external track:

- `PR-35A — Controlled Pilot Bench Execution`

This means:

- the frozen controlled pilot bundle was exercised on the live bench
- `GPIO34` and `GPIO35` input paths were confirmed
- `GPIO25` output proof was confirmed through the LED path
- reboot/persistence behavior was confirmed within current bench scope
- this phase is no longer the main active blocker

## Next Truth Boundary

The repo-side truth for the controlled pilot is already frozen.

`PR-35A` has already produced:

- real bench execution
- bounded physical/manual evidence
- reboot / persistence confirmation
- one bounded pilot verdict

The next meaningful state change now returns to:

- frontend stabilization
- machine-first roadmap execution
- authoring/runtime UX simplification around channels, signals, and machine composition

## Forward Roadmap Rebase

Historical Waves 5 through 18 remain frozen implementation history and valid
proof of architectural baselines.

Forward product planning is now rebased around the machine-first roadmap:

- [Machine-First Goal And Version Roadmap](c:\Users\Administrator\Documents\PlatformIO\Projects\vNext\docs\merge\machine-first-goal-and-version-roadmap-v1.md)

The rebased direction is:

- machine compositions over domain-specific kernel entities
- rule-based first-class diagnostics
- one shared project model across real, simulation, and training contexts
- separate simulation/training product later, on the same model
