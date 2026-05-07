# HAL

## Scope

The HAL layer is the only boundary where future runtime code may talk to hardware.

Stage 3 provides:
- portable C++17 interface headers
- deterministic in-memory/mock backends
- host-side tests
- explicit safe-state behavior contracts

Stage 27 adds:
- a typed LILYGO T3 V1.6.1 board profile
- reserved-pin enforcement for the first ESP32 bring-up target
- real ESP32 backends for relay, DI, AI, PWM, pulse and display
- a narrow SSD1306-compatible text renderer for the built-in OLED

Stage 3 intentionally did not provide:
- ESP-IDF backends
- GPIO access
- ADC/PWM/RMT drivers
- board bring-up
- runtime logic
- SignalRegistry
- ActuatorManager

## Philosophy

HAL exists to keep hardware access separate from business logic.

Runtime modules should depend on stable interfaces and typed results, not on board-specific APIs.
The first implementation was mock-first so the contract could be exercised on the host before any real ESP32 or board-specific backend existed.
Stage 27 keeps the same interface boundary and adds only target-specific backend code behind it.

## Common Types

Shared types live in `firmware/components/hal/include/hal/hal_common.hpp`.

Key types:
- `HalStatus` and `HalResult<T>` for structured outcomes
- `HalErrorCode` for stable error categories
- `RelayState`, `SafeState`
- `InputValidity`, `InputPolarity`
- `PwmDutyPercent`, `PulseCount`
- `MonotonicTimeMs`
- `StepperDirection`, `StepperStopMode`
- `AnalogScaling`

Relevant error codes in this stage:
- `ok`
- `not_initialized`
- `unknown_id`
- `invalid_range`
- `fault`
- `write_denied`
- `unsupported`

## Interface Responsibilities

### Relay HAL

Responsibilities:
- initialize relay channels
- set and read relay state
- expose explicit configured safe state
- apply per-relay or global safe state

Mock behavior:
- supports multiple relays
- defaults to OFF safe/startup behavior unless configured otherwise
- contains no latching or timing logic

### Digital Input HAL

Responsibilities:
- read raw physical state
- read debounced logical state
- configure debounce interval
- configure active-high or active-low polarity
- expose input validity

Mock behavior:
- debounce is handled inside the mock backend
- debounce uses injected monotonic time for deterministic tests
- raw injection is explicit and test-oriented

### Analog Input HAL

Responsibilities:
- read raw ADC-like value
- read scaled engineering value
- configure linear scaling
- enable or disable clamp behavior
- expose input validity

Clamp rule in Stage 3:
- when clamp is disabled, scaled reads extrapolate linearly beyond the configured raw range
- when clamp is enabled, raw values are clamped to `raw_min..raw_max` before scaling

### Pulse Input HAL

Responsibilities:
- expose hardware-facing pulse counts
- expose a simple frequency placeholder
- allow mock-side count increments
- expose validity

Reset behavior in Stage 3:
- `reset_count()` exists for mock and future service scopes
- individual backends may deny reset using `write_denied`

### PWM HAL

Responsibilities:
- set and read duty percentage
- enable and disable outputs
- configure min/max/safe duty limits
- apply explicit safe state

Duty clamp rule in Stage 3:
- requested duty is clamped to configured `duty_min..duty_max` on every `set_duty_percent()` call
- `apply_safe_state()` sets duty to `duty_safe` and disables the output

### Stepper HAL

Responsibilities in this stage:
- enable or disable a stepper channel
- set and read direction
- set and read commanded step rate
- stop and emergency stop
- keep stop/emergency-stop behavior distinguishable in the mock backend

Intentionally postponed:
- motion planning
- acceleration
- homing
- position control

### Display HAL

Responsibilities:
- initialize a simple text display abstraction
- clear the buffer
- write indexed lines
- control backlight state
- expose line-count and optional line-width capabilities for safe text rendering

Mock behavior:
- stores line text in memory
- supports `read_line()` for tests
- may optionally enforce configured line width by truncation

ESP32 bring-up behavior:
- uses a minimal SSD1306-oriented I2C text backend
- keeps rendering line-based instead of adding a full graphics stack
- uppercases text for a compact built-in glyph set

## Safe-State Philosophy

HAL safe behavior must be explicit and easy to test.

In Stage 3 this means:
- relays expose configured safe on/off state
- PWM outputs expose configured safe duty and disable on safe apply
- stepper emergency stop is distinguishable from normal stop
- mock behavior is deterministic and has no hidden global state

In Stage 27 this additionally means:
- unbound optional test outputs stay inactive
- unbound DI/AI/pulse channels report safe default values with invalid validity where applicable
- board-reserved pins are not reused by default for generic IO

This stage does not implement system-wide safety policy or output arbitration.
Those concerns belong to later runtime layers.

## What Is Postponed

Postponed to later stages:
- board resource binding
- runtime-safe ownership/arbitration
- signal publication
- actuator management
- filtering, flow logic, PID logic, sequence logic
- UI behavior beyond a raw display buffer abstraction
- LoRa, SD and stepper target backends
