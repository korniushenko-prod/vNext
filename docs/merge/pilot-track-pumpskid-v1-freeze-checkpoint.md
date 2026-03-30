# Pilot Track Freeze Checkpoint

## Scope

`PumpSkidSupervisor v1` is frozen as the first bounded pilot track.

The accepted pilot path is:

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> apply/deploy/readback -> config-studio commissioning surface`

## Canonical Rules

- `PumpSkidSupervisor v1` stays bounded to one production-like pilot package.
- Package authoring remains package-level only; `RuntimePack` and target artifact remain package-neutral after flattening.
- ESP32 apply/readback support is accepted only as a bounded pilot baseline with config checksum/version echo.
- Config Studio commissioning support is accepted only as a bounded pilot surface for package state, configuration/apply, live readback, and diagnostics.
- No broad SCADA/HMI editor, no fleet deploy manager, no cloud transport, and no safety runtime are implied by this pilot.

## Canonical Assets

- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json`
- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.runtime-pack.snapshot.json`
- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.shipcontroller-artifact.json`
- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.readback.snapshot.json`
- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.package-overview.fixture.json`
- `docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.commissioning.fixture.json`

## Freeze Boundary

After this checkpoint:

- generic package waves remain frozen
- pilot changes are bugfix-only unless a new bounded directive is opened
- any broader productization step must be opened explicitly as a new wave, not smuggled into the pilot baseline
