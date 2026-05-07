# PID Tests

Host-side tests for both PID layers:

- Stage 16 standalone `PidCore`
- Stage 17 runtime `PidService`

Coverage focus now includes:

- config and descriptor validation with structured status codes
- explicit `sample_time_ms` update discipline
- direct/reverse sign semantics and anti-windup behavior
- manual/auto/hold/disabled/fault service semantics
- `SignalRegistry` PV/SP integration
- PWM request ownership through `ActuatorManager`
- runtime fault policy, signal publication and bounded history
