# ActuatorManager Component

Stage 5 introduces the portable `actuators` component.

Stage 5 scope:
- typed relay and PWM actuator targets
- request arbitration with fixed priority order
- deterministic same-priority tie-breaks
- relay interlock enforcement
- safe fallback when unowned or faulted
- SignalRegistry publishing of effective state and metadata
- host-side HAL application through mock HAL
- Stage 18 `MotorService` as a higher-level runtime abstraction over actuator targets
- motor start/stop/speed/direction commands with soft start, soft stop, start boost and reverse delay
- optional fault/tach signal integration, bounded motor history and runtime counters
- Stage 19 `StepperService` as a single-axis runtime abstraction over `StepperHal` plus `SignalRegistry`
- homing, absolute/percent moves, manual jog, bounded history and runtime signal publication

Explicit non-goals for this stage:
- no stepper arbitration through `ActuatorManager` yet
- no sequence, PID, logic or alarm evaluation
- no ESP-IDF backend
- no HTTP API, Web UI or MQTT
- no business-specific burner, pump or compressor logic
