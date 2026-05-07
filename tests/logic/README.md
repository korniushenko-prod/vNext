# Logic Tests

Host-side tests for Stage 12 cover:
- typed rule validation and registration
- `on_true`, `while_true` and `on_false` semantics
- `ConditionTree`, `ActuatorManager`, `TimerService`, `AlarmService`, `SequenceService` and `SignalRegistry` integration
- bounded rule history ordering and drop-oldest behavior
- deterministic signal publication and runtime snapshots
