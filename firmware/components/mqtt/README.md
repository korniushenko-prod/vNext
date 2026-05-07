# MQTT Component

Stage 24 adds a transport-neutral MQTT bridge for runtime status publication and a narrow set of safe inbound commands.

This component currently includes:
- typed descriptor, result and history models
- deterministic topic mapper
- backend interface plus host-side mock backend
- scalar topic-per-field status publishing
- sequence, flow and PID command parsing/delegation
- bounded in-memory MQTT history

This stage intentionally does not include:
- real broker networking
- ESP-IDF MQTT client code
- Home Assistant discovery
- JSON-heavy payload contracts
- generic remote configuration editing
