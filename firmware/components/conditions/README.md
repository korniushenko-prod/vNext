# ConditionTree Component

Stage 8 introduces a portable `ConditionTree` evaluator for future runtime modules.

Stage 8 scope:
- typed condition tree model and tree validation
- `ALL`, `ANY`, `NOT`, `constant_bool`, `signal_compare`, `signal_range`, `signal_flag`
- deterministic evaluation using `SignalRegistry` snapshots plus explicit `now_ms`
- per-node runtime state with leaf `delay_on_ms` and `delay_off_ms`
- numeric hysteresis for `signal_compare` nodes with `gt`, `gte`, `lt`, `lte`
- flattened evaluation trace/checklist with reasons
- portable C++17 host-side tests

Explicit non-goals for this stage:
- no Rules runtime
- no Sequence Engine runtime
- no automatic AlarmService condition evaluation
- no ActuatorManager integration
- no HTTP API, Web UI or MQTT
- no persistence or expression parser
- no ESP-IDF dependency
