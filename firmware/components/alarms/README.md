# AlarmService Component

Stage 7 introduces a deterministic `AlarmService` for future runtime modules.

Stage 7 scope:
- typed alarm descriptors, runtime state and aggregate status
- explicit severity ordering and latching semantics
- manual reset rules for latched alarms
- SignalRegistry publication for aggregate and per-alarm status
- bounded in-memory alarm history
- portable C++17 host-side tests

Explicit non-goals for this stage:
- no ConditionTree evaluation
- no automatic alarm rules evaluation
- no Rules or Sequence Engine integration
- no ActuatorManager trip enforcement
- no HTTP API, Web UI or MQTT
- no storage persistence
- no ESP-IDF dependency
