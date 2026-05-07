# TimerService Component

Stage 6 introduces a deterministic `TimerService` for future runtime modules.

Stage 6 scope:
- typed timer descriptors and runtime state
- explicit `now_ms` updates with no hidden wall clock
- deterministic support for input-driven, window and watchdog timers
- SignalRegistry publication for timer status
- portable C++17 host-side tests

Explicit non-goals for this stage:
- no Rules runtime
- no Sequence Engine runtime
- no AlarmService runtime
- no PID runtime
- no Flowmeter runtime
- no ESP-IDF backend
