## Purpose

`RemotePointFrontend v1` is the public single-point remote value object for the
Wave 4 Modbus RTU read-only baseline.

It declares a normalized remote read with health and stale semantics while
remaining target-neutral at the contract layer.

## Scope

Frozen through `PR-16D`:

- one remote point read
- one bridge reference
- one register/decode contract
- normalized value and source quality outputs
- deterministic `RuntimePack -> ShipController artifact` path

Still intentionally excluded:

- write commands
- batching and multi-point scheduling
- vendor-specific register maps
- protocol families other than Modbus RTU

## Public ports

Outputs:

- `value_out`
- `source_ok`
- `stale`

## Parameters

- `bridge_ref`
- `register_address`
- `register_kind`
- `register_count`
- `byte_order`
- `word_order`
- `value_decode`

## End-to-end status

This slice now proves the full baseline path:

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact()`

Negative baseline coverage is also fixed for:

- missing `bridge_ref`
- missing bus binding via the referenced `CommBridge`

## Files in this slice

- `remote-point-frontend.object-type.json` - canonical library object contract
- `remote-point-frontend.project.minimal.json` - minimal project using the object
- `remote-point-frontend.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `remote-point-frontend.shipcontroller-artifact.json` - canonical ESP32 ShipController artifact snapshot
