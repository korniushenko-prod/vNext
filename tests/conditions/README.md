# ConditionTree Tests

Host-side tests for Stage 8 cover:
- typed compare, range and signal flag behavior
- `ALL`, `ANY` and `NOT` group semantics
- deterministic flattened trace ordering without short-circuit omission
- leaf `delay_on_ms` and `delay_off_ms`
- numeric compare hysteresis rules
- structured validation and evaluation errors
- `SignalRegistry` integration for typed values and flags
