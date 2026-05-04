# AGENTS.md

## Project

ESP32-C3 Relay / Flow / PID / Sequence Controller.

This project is a local automation controller for relays, inputs, flowmeter, PID, PWM, stepper actuators, alarms, rules and sequence programs.

## Non-negotiable architecture rules

1. Do not access GPIO directly outside HAL.
2. Do not control outputs directly outside ActuatorManager.
3. All output requests must include priority, owner, target and reason.
4. Priority order:
   Safety > Trip > Inhibit > Service > Manual > Sequence > PID > AutoRule > Schedule > Default.
5. Manual must never override Safety or Trip.
6. Config must be validated before apply.
7. Invalid config must leave outputs in safe state.
8. Use SignalRegistry for all runtime values.
9. Use shared ConditionTree for Rules, Alarms and Sequence transitions.
10. Use TimerService and fake clock in tests.
11. Do not use blocking sleeps in runtime logic.
12. Every runtime module must have unit tests.
13. Protected lifetime totalizers cannot be reset by normal reset or factory reset.
14. Every actuator must expose effective state and reason.
15. Every rule and sequence state must expose status and reason.
16. Fuel and ignition role outputs must fail safe OFF when unowned or faulted.
17. Keep changes small and PR-scoped.

## Stage 0 restrictions

Do not implement runtime logic.
Do not implement GPIO drivers.
Do not implement Web UI pages.
Do not implement API endpoints.
Do not implement rules, sequence, PID or flow logic.
Do not add real business logic.
Do not choose final pin mapping.
Do not hardcode burner, pump or compressor algorithms.

## Web UI principles

The UI is for mechanics first.

The UI must show:
- what is happening
- what step is active
- what output is active
- why something is blocked
- what alarm is active
- what must be fixed

Do not expose JSON as the primary UI.

## Sequence Engine principles

A Program is a sequence of States.

A State has:
- entry_actions
- active_actions
- exit_actions
- guards
- transitions
- min_time
- max_time
- on_timeout
- on_fault

Sequence Engine must use:
- SignalRegistry for conditions
- ConditionTree for evaluation
- TimerService for time
- AlarmService for trips
- ActuatorManager for outputs

## Safety note

This firmware is not a certified safety PLC or certified burner management system.

External hardware safety devices are required where applicable:
- emergency stop
- flame safeguard
- thermal relays
- fuses
- contactors
- independent thermostats/pressure switches
- normally closed safety chains
