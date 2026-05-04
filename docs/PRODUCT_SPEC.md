# Product Specification

## Summary

ESP32-C3 Relay / Flow / PID / Sequence Controller is a local automation controller intended to support compact machine and process control with a mechanics-friendly user experience and a validated expert mode for advanced setups.

## Scope

The product is intended to support:
- 4 relay outputs
- configurable DI/AI/Pulse inputs
- flowmeter and totalizers
- PID control
- PWM/DC motor control
- Step/Dir stepper control
- rules
- alarms and trips
- sequence programs
- templates
- Web UI
- HTTP API and MQTT
- future display and Modbus support

## UX direction

The primary UI must be mechanics-friendly:
- show current state clearly
- show active outputs clearly
- show why something is blocked
- show alarms and trips with reasons
- show what needs to be fixed

An expert custom program mode is allowed, but it must remain validated and safe to apply.

## Product philosophy

This controller is local-first and data-driven.

Templates generate configuration.
Runtime executes configuration.

The runtime must remain generic and must not contain hardcoded pump-only, burner-only or incinerator-only application behavior.
