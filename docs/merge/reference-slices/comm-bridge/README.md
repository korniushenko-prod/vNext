## Purpose

`CommBridge v1` is the public communications bridge object for the Wave 4
Modbus RTU read-only baseline.

It keeps bus identity, timeout semantics, and poll scheduling in the object
layer so the user works with a normal library object instead of a separate
protocol-specific universe.

## Scope

Frozen through `PR-16D`:

- Modbus RTU only
- read-only baseline
- single-device bridge metadata
- deterministic `RuntimePack -> ShipController artifact` path
- health, stale, and error status outputs

Still intentionally excluded:

- runtime polling engine
- remote writes
- vendor register maps
- Modbus TCP
- CAN
- MQTT
- OPC UA

## Public ports

Outputs:

- `bridge_ok`
- `stale`
- `error_code`

## Parameters

- `port_ref`
- `baud_rate`
- `parity`
- `stop_bits`
- `slave_id`
- `timeout_ms`
- `poll_period_ms`
- `startup_delay_ms`
- `stale_timeout_ms`

## End-to-end status

This slice now proves the full baseline path:

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact()`

No polling engine, remote write path, or vendor-specific integration is
introduced at this stage.

## Files in this slice

- `comm-bridge.object-type.json` - canonical library object contract
- `comm-bridge.project.minimal.json` - minimal project using the object
- `comm-bridge.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `comm-bridge.shipcontroller-artifact.json` - canonical ESP32 ShipController artifact snapshot
