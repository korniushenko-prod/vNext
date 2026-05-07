# SignalRegistry Component

Stage 4 introduces the portable SignalRegistry component.

Stage 4 scope:
- typed signal descriptors
- typed runtime values using `std::variant`
- runtime signal state separate from descriptors
- structured registration, update and read APIs
- deterministic stale calculation from caller-supplied `now_ms`
- writable virtual signals
- host-side test support

Explicit non-goals for this stage:
- no ESP-IDF backend
- no runtime logic, rules or sequence execution
- no ActuatorManager
- no Flowmeter or PID runtime
- no HTTP API, MQTT or Web UI
- no JSON parsing or serialization
