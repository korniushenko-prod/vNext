# Simulator

## Purpose

Stage 26 adds a deterministic host-side simulator for integration verification before real hardware bring-up.

It is intended to exercise the existing runtime stack end-to-end:
- templates
- sequence
- logic
- PID
- flow
- actuators
- alarms
- MQTT smoke publication
- display smoke rendering

The simulator is for logic validation, not accurate equipment physics.

## What It Is

The simulator provides:
- `SimClock` with explicit `now_ms`, `advance_ms()` and `set_time_ms()`
- scheduled signal and command injection through `SimSignalInjector`
- simple plant models for pressure, flow pulses and incinerator temperature
- `SimHarness` that wires runtime services to mock HAL and storage
- `SimScenarioRunner` that advances scenarios in fixed deterministic steps
- structured simulator result codes and reason strings

## What It Is Not

The simulator is intentionally not:
- a real hardware backend
- a Web UI or HTTP test environment
- a real MQTT broker or network stack
- a generic SCADA simulator
- a high-fidelity thermodynamics or CFD model
- a threaded or real-time scheduler

## Explicit Time Model

All simulator activity is driven by explicit caller-controlled time.

Rules:
- no hidden wall clock
- no `sleep`
- no threads
- repeated runs with the same inputs and `step_ms` produce the same results

`SimClock` is the only scenario time source:
- `now_ms()`
- `advance_ms(delta_ms)`
- `set_time_ms(value)`

## Harness Composition

`SimHarness` wires the existing runtime stack together with host-side dependencies:
- `SignalRegistry`
- mock relay, PWM, pulse, stepper and display HALs
- in-memory `StorageService`
- `ActuatorManager`
- `TimerService`
- `AlarmService`
- `SequenceService`
- `LogicService`
- `FlowService`
- `PidService`
- `MotorService`
- `StepperService`
- `TemplateEngine`
- `MqttService` and `DisplayService` for smoke coverage

This keeps simulator scenarios close to the runtime that will later run on hardware.

## Update Order

Each simulation step uses one documented deterministic order:

1. apply scheduled external events for the current timestamp
2. tick pre-plant runtime services
3. advance plant/discrete simulation components
4. tick post-plant runtime services
5. evaluate scheduled assertions and collect snapshots

Current service order inside `SimHarness` is:

Pre-plant:
- `TimerService`
- `StepperService`
- `MotorService`
- `SequenceService`
- `LogicService`
- `PidService`

Post-plant:
- `FlowService`
- `MqttService`
- `DisplayService`

There is no separate actuator-reconcile phase in Stage 26 because runtime services already drive `ActuatorManager`, and `ActuatorManager` applies the effective output state to the mock HAL synchronously during those service ticks.

This order is an engineering test contract and should remain stable unless the simulator documentation and tests are updated together.

## Plant Models

The models are intentionally simple, deterministic engineering approximations.

### FirstOrderPressurePlant

Inputs:
- relay and/or PWM actuator drive

Outputs:
- numeric pressure signal

Behavior:
- pressure rises with command drive
- pressure decays toward ambient when drive falls away
- clamped by `max_pressure`

Typical use:
- pressure pump start/stop logic
- PID pressure convergence

### PulseFlowPlant

Inputs:
- relay and/or PWM actuator drive

Outputs:
- deterministic pulse-count increments through `MockPulseInputHal`
- optional flow-rate signal publication

Behavior:
- flow rate is proportional to command drive
- pulses are generated from flow and `k_factor_pulses_per_unit`

Typical use:
- batch completion
- lifetime total updates
- no-flow style scenario coverage

### BurnerScenarioHarness

This is a discrete scripted signal source, not a physics model.

It drives:
- `air_ok`
- `flame_detected`
- optional temperature signal

Typical use:
- supervisory sequence transitions
- normal ignition path
- flame-loss and lockout paths

### IncineratorTemperaturePlant

Inputs:
- diesel, sludge and fan outputs

Outputs:
- chamber temperature signal

Behavior:
- diesel and sludge outputs raise temperature
- passive and fan-assisted cooling lower temperature
- values are deterministic and bounded

Typical use:
- warmup threshold transitions
- sludge enable/run gates
- cooldown verification

## Event Injection

`SimSignalInjector` supports deterministic scheduled events such as:
- writing boolean or numeric signals at time `T`
- asserting a boolean signal for an interval
- toggling signal validity/fault state
- incrementing pulse counts
- setting pulse frequency
- asserting alarm conditions
- issuing sequence, flow and PID commands
- running a custom callback event when a small one-off action is useful

## Supported Scenario Coverage

Stage 26 adds host-side tests for:
- `test_sim_clock.cpp`
- `test_pressure_pump_scenario.cpp`
- `test_pid_pressure_scenario.cpp`
- `test_flow_batch_scenario.cpp`
- `test_burner_supervisory_scenario.cpp`
- `test_incinerator_supervisory_scenario.cpp`
- `test_sim_fault_injection.cpp`

The key template-driven scenarios exercise:
- `pressure_pump`
- `pid_pressure_pwm_pump`
- `batch_dosing`
- `burner_supervisory_skeleton`
- `incinerator_supervisory_skeleton`

## Tolerances

Tests intentionally use pragmatic engineering tolerances instead of perfect-control expectations.

Examples:
- pressure converges within a loose band around setpoint rather than exact equality
- batch completion is accepted within a pulse/volume tolerance window
- sequence tests assert ordered state traversal instead of millisecond-perfect timing on every transition

These tolerances are part of the simulator contract and should stay explicit in scenario tests.

## Structured Results

Simulator runs report structured status through `SimStatus` and `SimScenarioRunReport`.

Stable result codes include:
- `SIM_OK`
- `SIM_INVALID_CONFIGURATION`
- `SIM_SCENARIO_FAILED`
- `SIM_EVENT_ERROR`
- `SIM_ASSERTION_FAILED`
- `SIM_PLANT_ERROR`
- `SIM_SERVICE_ERROR`

Failed scenarios should return a stable code plus a reason string suitable for test diagnostics.

## Limitations

Current limitations are intentional:
- no hardware-in-the-loop support yet
- no real GPIO, PWM, pulse or display backend
- no attempt to model real burner safety hardware
- no accurate pump curves, thermal inertia libraries or combustion modelling
- no generic scenario DSL beyond typed helper APIs

## Next Stage Boundary

Hardware bring-up remains a separate next stage.

Stage 26 exists to de-risk that work by validating the software stack with deterministic host-side scenarios first.
