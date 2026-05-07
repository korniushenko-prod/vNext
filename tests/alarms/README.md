# AlarmService Tests

Host-side tests for Stage 7 cover:
- typed alarm registration, duplicate rejection and deterministic ordering
- non-latching and latching condition semantics
- reset-denied and successful reset behavior
- aggregate severity/status updates
- SignalRegistry publication for aggregate and per-alarm signals
- bounded in-memory history ordering and eviction policy
