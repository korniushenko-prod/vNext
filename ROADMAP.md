# Roadmap

## Phase 0 — Project foundation

Repository structure, docs, AGENTS.md, roadmap, safety notes.

## Phase 1 — Config model

Versioned configuration model and validation.

## Phase 2 — Storage

Active/backup config, CRC, protected totalizers.

## Phase 3 — HAL skeleton

Relay, DI, AI, Pulse, PWM, Stepper, Display interfaces and mock HAL.

## Phase 4 — SignalRegistry

Unified signal layer.

## Phase 5 — ActuatorManager

Priority arbitration and output reason strings.

## Phase 6 — TimerService

TON, TOF, TP, watchdog, min on/off, state timers.

## Phase 7 — AlarmService

Warnings, inhibit, trip, safety, reset conditions.

## Phase 8 — ConditionTree

Shared condition evaluator for rules, alarms and sequence transitions.

## Phase 9 — Sequence Engine MVP

Data-driven state machine for process programs.

## Phase 10 — Sequence API

HTTP API for program status, start, stop, reset.

## Phase 11 — Program Dashboard UI

Mechanics-friendly program status page.

## Phase 12 — Logic Engine

Background IF/THEN rules.

## Phase 13 — Rules UI

Rule cards and form-based rule editor.

## Phase 14 — Flowmeter

Pulse counting, flow, totalizers, batch, trend.

## Phase 15 — Flow UI

Flowmeter dashboard and setup.

## Phase 16 — PID core

Standalone PID library.

## Phase 17 — PID Service

PID connected to SignalRegistry and ActuatorManager.

## Phase 18 — PWM/DC Motor

PWM output and DC motor service.

## Phase 19 — Stepper MVP

Step/Dir, homing, limits, position.

## Phase 20 — Program Builder Wizard

Template-based setup for mechanics.

## Phase 21 — Custom Program Step Editor

Manual step-by-step sequence builder.

## Phase 22 — Output Matrix UI

Matrix of outputs per program state.

## Phase 23 — Templates

Smart relay, pump, flow, dosing, PID pump, compressor, burner supervisory, incinerator supervisory.

## Phase 24 — MQTT

Status and safe commands.

## Phase 25 — Display

Local display abstraction.

## Phase 26 — Simulator

Process simulator and integration tests.

## Phase 27 — Hardware bring-up

ESP32-C3 HAL implementation.

## Phase 28 — Bench tests

Safe bench testing with indicators and mock loads.

## Phase 29 — Beta

Feature-complete beta.

## Phase 30 — Release Candidate

Hardening, docs, validation, testing.
