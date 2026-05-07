# TimerService Tests

Host-side tests for Stage 6 cover:
- typed timer registration and deterministic snapshot ordering
- input-driven semantics for `TON`, `TOF`, `TP`, `MIN_ON` and `MIN_OFF`
- watchdog arm, kick, expire, disarm and error handling
- manual window semantics for startup, cooldown and state timers
- SignalRegistry publication for timer status signals
