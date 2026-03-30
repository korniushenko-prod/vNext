# PumpSkid v1 Pilot Scope

## Intent

`PumpSkidSupervisor v1` is the first product-track pilot package built on top of
the frozen generic platform waves. It is intentionally bounded to a single
production-like pump-skid node so the team can close a real
`authoring -> materializer -> target -> commissioning` loop without reopening
generic platform scope.

## In Scope

- one pilot package: `PumpSkidSupervisor v1`
- bounded package overview
- package modes: `off`, `auto`, `manual`
- bounded package operations and reset/service lanes
- run / fault / readiness aggregation
- frozen package layers:
  permissive/interlock, protection/recovery, arbitration,
  override/handover, bounded mode execution
- live readback / snapshot baseline
- target deploy / apply baseline
- package templates and presets
- config-studio commissioning surface for the pilot package

## Out Of Scope

- multi-pump fleet orchestration beyond bounded v1
- remote write over communications
- vendor-specific integrations
- boiler or burner-specific logic
- safety runtime
- new package-neutral schema redesign

## MVP Cutline

The pilot MVP is reached only when `PumpSkidSupervisor v1` closes:

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> apply/deploy/readback -> config-studio commissioning surface`

## Boundary Notes

- this pilot reuses frozen generic layers and must not reopen them by default
- the package remains package-neutral after flattening
- target support is bounded to the pilot profile and deploy/readback baseline
