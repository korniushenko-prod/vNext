# ESP32-C3 Relay / Flow / PID / Sequence Controller

Local ESP32-C3 based automation controller for:
- 4 relay outputs
- configurable DI/AI/Pulse inputs
- flowmeter and totalizers
- PID control
- PWM/DC motor control
- Step/Dir stepper control
- alarms and trips
- rule engine
- sequence engine for step-by-step process programs
- Web UI
- HTTP API
- MQTT

## Project status

Stage 1: versioned config model and validator.

No runtime logic is implemented yet.

## Main concept

This project is data-driven.

Templates generate configuration.
Runtime executes configuration.

The firmware should not contain hardcoded application-only algorithms for pumps, burners or incinerators.

## Core modules

- HAL for all hardware access
- SignalRegistry as unified runtime signal layer
- ActuatorManager for arbitration and safe output ownership
- TimerService for timing and deterministic tests
- Alarm and trip services
- ConditionTree for shared condition evaluation
- Sequence Engine for step-by-step programs
- Rule and logic layers
- Flowmeter, totalizer and PID services
- Storage, API and embedded Web UI

## Local-first operation

The controller is intended to run locally on the device.

Primary operation must remain possible without cloud dependencies. Remote integrations such as MQTT are secondary and must not replace local control and local diagnostics.

## Safety

This is not a certified safety PLC or certified burner management system.

External hardware safety devices are required for real machinery.

Safety and Trip states must always override Manual, PID, Sequence and Rules.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md).
