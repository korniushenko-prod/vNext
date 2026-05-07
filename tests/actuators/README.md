# ActuatorManager Tests

Host-side tests for Stage 5 cover:
- target registration and structured errors
- relay and PWM safe fallback behavior
- fixed priority arbitration and deterministic same-priority tie-breaks
- relay interlock winner/loser behavior
- SignalRegistry publishing of effective state and metadata

Stage 18 expands this directory with `MotorService` coverage for:
- descriptor validation and structured command errors
- soft start, soft stop and start boost timing
- reverse rejection, reverse delay and direction mapping
- fault/tach integration and output-clear semantics
- SignalRegistry publication, runtime counters and bounded history

Stage 19 expands this directory with `StepperService` coverage for:
- descriptor validation and structured command errors
- homing, move-to-steps, move-to-percent and manual jog timing
- limit and fault signal handling
- SignalRegistry publication, snapshots and bounded history
