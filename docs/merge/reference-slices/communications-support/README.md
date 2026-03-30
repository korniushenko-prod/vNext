## Purpose

These support contracts define the internal authoring baseline for Wave 4
communications without introducing a new top-level schema kind.

They stay as explicit JSON support fixtures in `PR-16A` so we can lock the
contract surface for `Modbus RTU` read-only baseline work before any
materializer or target execution exists.

## Included support contracts

- `ModbusRtuBusFrontend v1`
- `RegisterMap v1`
- `PollSchedule v1`

## Scope

- Modbus RTU only
- read-only baseline only
- single-point read metadata only

## Still excluded

- write commands
- runtime polling engine
- vendor-specific maps
- Modbus TCP
- CAN
- MQTT
- OPC UA
