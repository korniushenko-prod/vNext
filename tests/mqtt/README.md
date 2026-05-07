# MQTT Tests

Stage 24 adds host-side tests for the transport-neutral MQTT bridge.

Coverage includes:
- deterministic topic mapping
- availability and periodic status publishing
- sequence, flow and PID command handling
- structured error surfacing
- bounded MQTT history ordering and drop-oldest behavior

These tests use `MockMqttClientBackend` only.
No real broker, socket or ESP-specific transport is required.
