# Logic Component

Stage 12 introduces the portable `LogicService` component for background IF/THEN rules.

This component provides:
- typed rule descriptors, actions, snapshots and structured results
- deterministic registration-order evaluation
- `on_true`, `while_true` and `on_false` action semantics
- `ConditionTree` evaluation with per-rule runtime state
- `ActuatorManager`, `TimerService`, `AlarmService`, `SequenceService` and `SignalRegistry` integration
- bounded in-memory rule history

This stage intentionally does not include:
- rules UI or editor
- HTTP API, Web UI or MQTT bindings
- textual rule parsing/import
- persistence of rules or history
