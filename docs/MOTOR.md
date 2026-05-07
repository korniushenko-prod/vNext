# MotorService

## Purpose

`MotorService` is the Stage 18 runtime abstraction for ordinary PWM-driven DC motors.

It sits above raw actuator targets so the rest of the runtime can treat a motor as:
- a run/stop mechanism
- an open-loop speed mechanism in percent
- an optionally reversible mechanism
- a fault-aware runtime object with counters, history and reasoning

It does not replace `ActuatorManager`, PWM targets or arbitration.

## Raw PWM vs Motor Abstraction

Raw PWM target:
- only knows about target ownership, priority and effective duty

`MotorService`:
- owns requested vs effective run/speed/direction state
- ramps speed over time with explicit `now_ms`
- handles start boost and reverse delay
- reads optional fault/tach signals
- publishes motor-oriented runtime signals and history

The output path still goes through `ActuatorManager` only.

## Command Model

Each `MotorCommand` carries:
- `run`
- `speed_percent`
- `direction`
- `priority`
- `source`
- `reason`
- `now_ms`

Runtime output ownership always uses:
- owner: `motor:<id>`
- priority: taken from the current command

## Runtime States

Stage 18 runtime states:
- `stopped`
- `starting_boost`
- `ramping_up`
- `running`
- `ramping_down`
- `reversing_delay`
- `fault`

Snapshots expose both requested and effective state:
- requested run/speed/direction
- effective run/speed/direction
- runtime state, fault state and last reason

## Soft Start And Stop

`MotorService` is explicit-time-driven.
There is no wall clock and no blocking sleep.

Soft start:
- stop-to-run transition optionally enters `starting_boost`
- otherwise ramps toward requested speed at `ramp_up_percent_per_sec`

Soft stop:
- run-to-stop transition ramps toward zero at `ramp_down_percent_per_sec`
- once zero is reached, PWM and enable ownership are cleared

## Start Boost

When configured:
- boost applies only on a true stop-to-run transition
- effective speed jumps to `start_boost_percent`
- boost holds for `start_boost_ms`
- after boost, speed ramps toward the requested target, including ramp-down if the target is lower than the boost

## Reverse Delay

When reverse is allowed and a direction target exists:
- stopped direction changes apply immediately
- running direction changes ramp to zero first
- then `reversing_delay` holds for `reverse_delay_ms`
- then direction flips and the motor starts again with normal boost/ramp rules

Direction target mapping in Stage 18:
- `forward = relay OFF`
- `reverse = relay ON`

## Fault Semantics

Optional fault input is read from `SignalRegistry`.

Stage 18 fault policy:
- fault input `true` forces runtime state to `fault`
- effective run becomes false
- effective speed becomes zero
- motion outputs are cleared
- if `fault_clears_output=true`, direction ownership is cleared too

Faults are non-latching in this stage:
- once the fault input clears, the motor returns to `stopped`
- the motor does not auto-restart
- a fresh run command is required

Missing fault signals are not registration failures and do not fault the motor by default.

## Tach Semantics

Optional tach input is read from `SignalRegistry`.

Stage 18 tach support is read-only:
- numeric tach values are copied into snapshot/signal state when available
- missing tach signals do not fault the motor by default
- there is no closed-loop speed control yet
- there is no stall detection or current-based protection yet

## Signal Publication

When `publish_signals=true`, `MotorService` publishes:
- `motor.<id>.enabled`
- `motor.<id>.runtime_state`
- `motor.<id>.requested_run`
- `motor.<id>.requested_speed_percent`
- `motor.<id>.requested_direction`
- `motor.<id>.effective_run`
- `motor.<id>.effective_speed_percent`
- `motor.<id>.effective_direction`
- `motor.<id>.fault`
- `motor.<id>.fault_reason`
- `motor.<id>.tach_value` when tach is configured
- `motor.<id>.runtime_ms`
- `motor.<id>.start_count`
- `motor.<id>.last_reason`

## Counters And History

Stage 18 runtime counters:
- `runtime_ms`
- `start_count`

Stage 18 bounded in-memory history records at minimum:
- registration
- command receipt
- starts
- stops
- direction changes
- fault enter/clear
- output request/clear transitions

## Intentionally Postponed

Stage 18 does not add:
- new on-device motor UI pages
- HTTP API
- MQTT
- PID-to-motor orchestration
- stepper logic
- closed-loop speed control
- current sensing or advanced stall detection
- VFD or Modbus motor control
- persistent motor runtime storage
