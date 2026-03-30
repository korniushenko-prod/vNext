## Purpose

`Combined Remote Point` is the canonical communications composition example for
the Wave 4 baseline.

It shows the intended public authoring shape:

- one `CommBridge`
- one `RemotePointFrontend`
- one Modbus RTU read-only single-point configuration

It now proves the full baseline path for:

- `CommBridge`
- `RemotePointFrontend`
- one normal downstream consumer connection
- deterministic ESP32 ShipController artifact emission

## End-to-end status

This slice is the canonical communications baseline proof for:

`ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact()`

The chain stays object-first and target-deterministic without adding a polling
engine, remote write lifecycle, or vendor-specific runtime logic.

## Files in this slice

- `combined-remote-point.project.minimal.json` - canonical composition example
- `combined-remote-point.runtime-pack.snapshot.json` - materialized target-neutral runtime pack snapshot
- `combined-remote-point.shipcontroller-artifact.json` - canonical ESP32 ShipController artifact snapshot
