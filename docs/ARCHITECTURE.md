# Architecture

## Core principle

The runtime is data-driven.

Templates generate configuration.
Runtime executes configuration.

Application-specific behavior must be expressed as validated configuration and reusable templates, not as hardcoded controller-specific algorithms in runtime modules.

## Layers

### Config Model

The config component owns the typed and versioned configuration model, safe factory defaults and structured validation. Runtime must only execute validated configuration.

### HAL

Owns all hardware access:
- GPIO
- ADC
- pulse capture
- PWM
- Step/Dir
- display buses

No other layer may access hardware directly.

### Signal Layer

SignalRegistry provides the single runtime truth for process values, commands, statuses and derived signals.

### Actuator Layer

ActuatorManager arbitrates output requests by priority, owner and reason, then produces effective actuator state.

### Timer Layer

TimerService provides deterministic timing for runtime modules and tests.

### Alarm Layer

Alarm and trip services evaluate unsafe conditions and enforce safe-state behavior.

### Condition Layer

ConditionTree is the shared evaluator for:
- rules
- alarms
- sequence transitions

### Logic Engine

Evaluates general purpose IF/THEN and derived logic using SignalRegistry and ConditionTree.

### Sequence Engine

Executes step-by-step process programs using states, transitions, timers and output requests through ActuatorManager.

### Flowmeter

Owns pulse-based flow measurement, rate calculation, totals and protected lifetime totalizers.

### PID

Owns generic PID computation and delegates effective output requests through ActuatorManager.

### Storage

Owns configuration persistence, backup copies, integrity checks and protected counters.

### API

Exposes validated access to configuration, runtime state and control operations.

### Web UI

Static embedded UI served by firmware. Primary UX is mechanics-first.

### Templates

Templates describe reusable application-level patterns that generate validated configuration for the generic runtime.
