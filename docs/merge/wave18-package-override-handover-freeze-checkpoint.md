# Wave 18 Freeze Checkpoint

## Scope

Wave 18 freezes package override / handover as a generic, package-neutral,
metadata-first layer.

Accepted reference slices:

- `BoilerSupervisorOverrides v1`
- `PumpSkidSupervisorOverrides v1`

## Canonical Rules

- package override / handover stays additive-only
- holder lanes stay frozen as `auto`, `manual`, `service`, `remote`
- request kinds stay frozen as `request_takeover`, `request_release`,
  `request_return_to_auto`
- request states stay explicit as `accepted`, `blocked`, `denied`,
  `unsupported`
- denial reasons stay explicit as `blocked_by_policy`, `held_by_other_owner`,
  `not_available`
- holder and request refs remain flattened child runtime instances
- no package execution engine is introduced
- no backend handover transport is introduced

## Proven End-To-End Path

The accepted Wave 18 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_override_handover -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package overview`

## Frozen Outputs

Wave 18 now has canonical:

- authoring contracts and reference slices
- materialized runtime snapshots
- target capability/readback/artifact support
- config-studio read-only package override / handover surface
- dual-domain e2e outputs for boiler-like and non-boiler slices

## Non-Goals

Wave 18 does not open:

- package-local imperative handover execution
- backend transport for package handover requests
- package override / handover wizard flows
- safety workflows
- vendor-specific ownership logic

## Result

Wave 18 is frozen as the generic package override / handover baseline.
