# ADR-0018: Pilot Track PumpSkidSupervisor v1 Is Bounded And Production-Like

## Status

Accepted

## Context

After the generic package waves were frozen through Wave 18, the next step was
not another generic platform surface but the first product-track pilot:
`PumpSkidSupervisor v1`.

The goal of this pilot is to prove one bounded production-like path:

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> apply/deploy/readback -> config-studio commissioning surface`

The pilot must use the already-frozen generic layers instead of reopening them.

## Decision

`PumpSkidSupervisor v1` is accepted as the first bounded pilot track.

The pilot is explicitly limited to:

- one package domain: `PumpSkidSupervisor v1`
- one target family: `esp32.shipcontroller.v1`
- one bounded commissioning/readback/apply baseline
- one production-like commissioning surface in `config-studio`

The pilot does **not** introduce:

- a new generic package execution model
- a new generic target transport architecture
- a new generic commissioning framework
- fleet/cloud deployment semantics
- safety runtime
- vendor-specific integration

## Consequences

- packages remain authoring-layer inputs and still flatten into package-neutral runtime/target outputs
- adapter apply/readback support is now stateful for the bounded pilot path, but this does not imply a broad transport redesign
- config-studio now has a production-like commissioning surface for the pilot, but this does not turn it into a generic SCADA/HMI editor
- future pilot/product work must open as new bounded directives instead of silently expanding this pilot baseline
