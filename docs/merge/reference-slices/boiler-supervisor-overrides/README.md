# BoilerSupervisorOverrides v1

## Purpose

`BoilerSupervisorOverrides v1` is the boiler-like acceptance slice for the
Wave 18 package override / handover baseline.

It proves that package-level authority holders, current/requested holder
summary, and explicit bounded handover requests can be expressed as generic
package metadata without opening package execution runtime, safety semantics,
or boiler-specific ownership engines.

## Scope

Included here:

- boiler-like reference package override / handover contract
- authority holders and handover summary metadata
- bounded handover requests with explicit accepted / blocked / denied states
- summary outputs, aggregate monitor, and trace group
- self-contained project-local member object types

Intentionally excluded:

- imperative package handover execution
- backend handover transport
- safety or vendor-specific ownership logic

## Canonical Rules

- package override / handover remains generic, package-neutral, and bounded
- holder lanes stay frozen as `auto`, `manual`, `service`, `remote`
- request kinds stay frozen as `request_takeover`, `request_release`,
  `request_return_to_auto`
- request states stay explicit as `accepted`, `blocked`, `denied`,
  `unsupported`
- boiler-like content remains reference-only and non-privileged

## Files In This Slice

- `boiler-supervisor-overrides.package-definition.json` - canonical boiler-like
  package override / handover contract
- `boiler-supervisor-overrides.project.minimal.json` - minimal self-contained
  project instantiating the package
- `boiler-supervisor-overrides.project.e2e.json` - canonical end-to-end project
  for the slice
- `boiler-supervisor-overrides.runtime-pack.snapshot.json` - canonical
  flattened runtime output for the slice
- `boiler-supervisor-overrides.shipcontroller-artifact.json` - deterministic
  ESP32 ShipController artifact for the slice
- `boiler-supervisor-overrides.package-overview.fixture.json` - canonical
  config-studio read-only package overview fixture

## End-To-End Gate

The accepted Wave 18 path is:

`ProjectModel -> materializeProject() -> RuntimePack.package_override_handover -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package surface`

