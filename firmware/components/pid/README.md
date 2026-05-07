# PID Component

This component now contains two layers:

- `PidCore` for standalone portable control math
- `PidService` for runtime integration with `SignalRegistry` and `ActuatorManager`

Current Stage 17 scope provides:

- typed PID core and service descriptors, snapshots, status and validation models
- explicit `now_ms` / `sample_time_ms` semantics with no hidden wall clock
- manual, auto, hold, disabled and runtime fault service semantics
- PWM-only actuator binding through `ActuatorManager`
- deterministic `pid.<id>.*` signal publication
- bounded in-memory PID service history
- host-side testability with no ESP-IDF dependency

This stage intentionally does not include:

- UI, HTTP API or MQTT
- autotune, feed-forward or cascade control
- persistent tuning/history storage
- stepper or motor PID targets
