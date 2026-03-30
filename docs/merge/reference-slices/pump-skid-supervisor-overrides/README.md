# PumpSkidSupervisorOverrides v1

## Purpose

`PumpSkidSupervisorOverrides v1` is the mandatory non-boiler acceptance slice
for the Wave 18 package override / handover baseline.

It proves that the same holder and handover vocabulary works on a second domain
without leaking boiler-shaped semantics, safety assumptions, or package-local
handover engines into shared package layers.

## Scope

Included here:

- non-boiler reference package override / handover contract
- authority holders and handover summary metadata
- bounded handover requests with explicit accepted / blocked / denied states
- summary outputs, aggregate monitor, and trace group
- self-contained project-local member object types

Intentionally excluded:

- skid-specific imperative runtime
- safety workflows
- package-local handover execution

## Canonical Rules

- package override / handover remains generic, package-neutral, and bounded
- pump-skid domain is the mandatory second acceptance domain
- holder lanes stay frozen as `auto`, `manual`, `service`, `remote`
- request kinds stay frozen as `request_takeover`, `request_release`,
  `request_return_to_auto`
- request states stay explicit as `accepted`, `blocked`, `denied`,
  `unsupported`

## Files In This Slice

- `pump-skid-supervisor-overrides.package-definition.json` - canonical
  non-boiler package override / handover contract
- `pump-skid-supervisor-overrides.project.minimal.json` - minimal self-contained
  project instantiating the package
- `pump-skid-supervisor-overrides.project.e2e.json` - canonical end-to-end
  project for the slice
- `pump-skid-supervisor-overrides.runtime-pack.snapshot.json` - canonical
  flattened runtime output for the slice
- `pump-skid-supervisor-overrides.shipcontroller-artifact.json` - deterministic
  ESP32 ShipController artifact for the slice
- `pump-skid-supervisor-overrides.package-overview.fixture.json` - canonical
  config-studio read-only package overview fixture

## End-To-End Gate

The accepted Wave 18 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_override_handover -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`

