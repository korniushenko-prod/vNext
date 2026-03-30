# Boiler Supervisor Coordination v1

## Purpose

`BoilerSupervisorCoordination v1` is the Wave 12 reference slice for
package-level coordination and package proxy operations.

It proves that a package can expose a stable supervisory coordination face while
still remaining an authoring-only orchestration layer over already flattened
child objects and already supported child operation lanes.

## Scope

Included here:

- package summary state baseline
- readiness / fault / circulation / control summaries
- package-level coordination monitors and traces
- exposed package proxy operations over child operations
- optional `pid_autotune_proxy` over the existing Wave 9 PID autotune path

Intentionally excluded:

- burner safety or flame safeguard logic
- ignition sequence or certified shutdown logic
- package execution kind
- package-specific runtime engine
- package-specific target execution hooks

## Canonical Rules

- package coordination stays authoring-only
- runtime and target outputs stay flattened and package-neutral
- package operation proxies must resolve only to already supported child operations
- package coordination must not bypass child runtime operation contracts
- `BoilerSupervisorCoordination v1` is supervisory only, not burner safety

## Files In This Slice

- `boiler-supervisor-coordination.package-definition.json` - canonical coordination package contract
- `boiler-supervisor-coordination.project.minimal.json` - minimal project instantiating the package
- `boiler-supervisor-coordination.project.e2e.json` - canonical e2e project closing the full package coordination path
- `boiler-supervisor-coordination.runtime-pack.snapshot.json` - canonical runtime pack including `package_coordination`
- `boiler-supervisor-coordination.shipcontroller-artifact.json` - canonical ESP32 ShipController artifact including deterministic `package_coordination`
- `boiler-supervisor-coordination.package-overview.fixture.json` - canonical coordination surface fixture for `config-studio`

## End-To-End Path

`Package-based ProjectModel -> materializeProject() -> RuntimePack.package_coordination -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package coordination surface`

## Freeze Note

Wave 12 opens package coordination as a narrow supervisory baseline only.
