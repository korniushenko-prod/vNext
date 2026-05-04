# Glossary

## Signal

A named runtime value in SignalRegistry used for commands, measurements, statuses or derived conditions.

## Actuator

A controllable output abstraction such as relay, PWM or stepper channel.

## HAL

Hardware Abstraction Layer. The only layer allowed to access device pins and peripherals directly.

## Rule

A background logic statement that evaluates conditions and requests effects.

## ConditionTree

A shared condition evaluation model used by rules, alarms and sequence transitions.

## Alarm

A reported abnormal condition that must be visible to the user and may require acknowledgment or reset.

## Trip

A high-priority protective shutdown condition that forces safe behavior.

## Inhibit

A blocking condition that prevents an action from starting even if a normal command is present.

## Sequence Program

A data-driven process program composed of states, transitions and actions.

## State/Step

A single active stage inside a sequence program.

## Transition

A rule that moves a sequence from one state to another.

## Entry action

An action executed when a state becomes active.

## Active action

An action or request maintained while a state remains active.

## Exit action

An action executed when a state stops being active.

## ActuatorManager

The layer that arbitrates output requests by priority, owner and reason, then determines effective output state.

## Flowmeter

A service that converts pulse input into rate, totals and related runtime values.

## Totalizer

A cumulative counter, often protected against unsafe reset.

## PID

Proportional–Integral–Derivative control algorithm used to regulate a process value toward a setpoint.

## PWM

Pulse-width modulation output used for power or speed control.

## Stepper

A Step/Dir actuator abstraction for position-based motion control.

## Template

A reusable high-level pattern that generates validated controller configuration.

## Protected lifetime totalizer

A cumulative counter that must survive resets and cannot be cleared by normal reset or factory reset.
