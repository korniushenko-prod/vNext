# Wave 17 Freeze Checkpoint

## Scope

Wave 17 freezes package command arbitration as a generic, package-neutral,
metadata-first layer.

Accepted reference slices:

- `BoilerSupervisorArbitration v1`
- `PumpSkidSupervisorArbitration v1`

## Canonical Rules

- package arbitration stays additive-only
- ownership lanes stay frozen as `auto`, `manual`, `service`, `remote`
- command request kinds stay frozen as `request_start`, `request_stop`,
  `request_reset`, `request_enable`, `request_disable`
- arbitration outcomes stay explicit as `accepted`, `blocked`, `denied`,
  `superseded`, `unsupported`
- package command targets remain flattened child runtime instances
- no package execution engine is introduced
- no vendor-specific arbitration logic is introduced

## Proven End-To-End Path

The accepted Wave 17 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_arbitration -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package overview`

## Frozen Outputs

Wave 17 now has canonical:

- authoring contracts and reference slices
- materialized runtime snapshots
- target capability/readback/artifact support
- config-studio read-only package arbitration surface
- dual-domain e2e outputs for boiler-like and non-boiler slices

## Non-Goals

Wave 17 does not open:

- package-local imperative command execution
- backend transport for package commands
- package command override UX
- safety workflows
- vendor-specific command handling

## Result

Wave 17 is frozen as the generic package arbitration baseline.
