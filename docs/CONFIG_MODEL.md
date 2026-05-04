# Config Model

## Purpose

The config component defines the typed and versioned controller configuration that all later stages will consume.

At Stage 1 this component provides:
- root config schema
- typed config structs and enums
- safe factory defaults
- structured validation results

It does not provide:
- JSON parsing
- serialization
- storage backend
- runtime apply
- SignalRegistry integration
- HAL access
- API or Web UI

## Common identity contract

Every configurable object in the model carries:
- `id`
- `name`
- `enabled`

This keeps references stable across validation, future storage, future UI editors and runtime application.

## Root structure

The root object is `DeviceConfig` and contains:
- `schema_version`
- `config_version`
- `device`
- `board`
- `inputs`
- `relays`
- `pwm_outputs`
- `pulse_inputs`
- `flowmeters`
- `pid_controllers`
- `steppers`
- `motors`
- `timers`
- `alarms`
- `rules`
- `programs`
- `templates`
- `network`
- `display`
- `storage`

## Object responsibilities

- `DeviceInfoConfig`
  Global identity and descriptive metadata for the controller instance.
- `BoardConfig`
  Hardware-facing mapping layer. Owns pin bindings and board-specific physical wiring only.
- `InputConfig`
  Logical input definition for DI, AI, pulse or flow-source semantics.
- `RelayConfig`
  Discrete actuator definition with role and safe-state policy.
- `PwmOutputConfig`
  Variable output definition with role, safe-state policy and allowed output range.
- `PulseInputConfig`
  Logical pulse-counting source derived from an input definition.
- `FlowmeterConfig`
  Flow calculation and protected totalizer settings derived from a pulse source.
- `PidControllerConfig`
  PID tuning and target selection only. Runtime behavior is postponed to later stages.
- `StepperConfig`
  Logical stepper actuator definition without direct pin ownership.
- `MotorConfig`
  Logical motor actuator definition without direct pin ownership.
- `TimerConfig`
  Reusable logical timer settings for later runtime services.
- `AlarmConfig`
  Alarm metadata, severity and condition references.
- `RuleConfig`
  Placeholder rule structure with condition/action containers and validated target references.
- `ProgramConfig`
  High-level sequence/program definition composed of states and transitions.
- `ProgramStateConfig`
  Program state definition including state type, actions and optional timing-related targets.
- `ProgramTransitionConfig`
  Transition definition between program states.
- `TemplateBindingConfig`
  Binding between template identifiers and concrete configured objects.
- `NetworkConfig`
  Networking-related device settings only.
- `DisplayConfig`
  Display-facing settings only.
- `StorageConfig`
  Save policy and protected lifetime totalizer-related policy.

## Separation of logical config and hardware mapping

Logical configuration must remain separate from hardware pin mapping.

Examples:
- relay behavior belongs to `RelayConfig`
- PID logic belongs to `PidControllerConfig`
- program steps belong to `ProgramConfig`
- explicit GPIO belongs only to `BoardConfig`

This means:
- a `ProgramConfig` may reference a relay by `id`, but never by GPIO number
- a `PidControllerConfig` may reference an output target by logical `id`, but never by physical pin
- a `FlowmeterConfig` may reference a pulse input by logical `id`, while the board decides how that pulse source is wired

This keeps templates, validation, runtime and future UI simpler and prevents application logic from being mixed with board-specific wiring.

## Validation philosophy

Validation is aggregated and structured.

The validator must:
- return all discovered issues
- distinguish warnings from errors
- return stable issue codes
- provide `path`, `code`, `severity` and `message`

The validator does not fail fast on the first issue.

Validation currently focuses on:
- schema/version sanity
- identity and uniqueness rules
- safe default constraints
- reference integrity between configured objects
- range sanity for numeric settings
- placeholders that are allowed at Stage 1 versus fields that are mandatory when an object is enabled

## Structured issues

`ValidationIssue` contains:
- `path`
- `code`
- `severity`
- `message`

`ValidationResult` contains:
- `valid`
- `issues`
- `has_errors()`
- `has_warnings()`

## What is intentionally postponed

Later stages will add:
- JSON import/export
- config persistence backend
- runtime execution of validated config
- full signal existence validation through SignalRegistry
- runtime apply and rollback flows

Also intentionally postponed:
- HAL-backed hardware probing
- API-level config transport
- Web UI-driven editing
- runtime ownership/arbitration semantics
- full sequence execution semantics
