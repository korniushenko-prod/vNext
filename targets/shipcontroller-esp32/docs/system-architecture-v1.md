# System Architecture V1

## Purpose

This document defines the target architecture for the controller platform.

It is the reference model for future code and UI decisions.

## Core Principle

The system must be configured, not rewritten.

The intended chain is:

`chip template -> board template -> resources -> channels -> blocks -> sequences -> UI/service`

## Design Rules

1. No application logic in HAL.
2. Hardware capabilities and project usage must remain separate.
3. Channels are universal and not tied to one board.
4. Blocks consume channels, not GPIO numbers.
5. Sequences manage complex mechanisms, not ad hoc block spaghetti.
6. Safety logic is distinct from normal control logic.
7. Web UI is a service and commissioning tool, not a debug dump.

## Layer Model

## 1. Hardware Templates

### Chip Template

Defines what the MCU can do in principle.

Examples:

- GPIO capabilities
- internal pull-up availability
- input-only pins
- strapping pins
- forbidden pins

### Board Template

Defines how a real board uses the chip.

Examples:

- onboard LED
- onboard OLED
- onboard LoRa
- SD card lines
- UART reservation
- safe/shared/exclusive/forbidden pin rules

### Board Instance

Defines the actual active board in a project.

Examples:

- selected board template
- explicitly reserved pins
- enabled onboard modules
- physically present resources

## 2. Resource Layer

Resources are physical access points exposed by the board.

Examples:

- GPIO-backed DI/DO/PWM
- ADC-backed analog input
- DAC-backed analog output
- counter input
- UART port
- RS485 port
- external ADC channel

Each resource should have:

- `id`
- `type`
- `physical source`
- `capabilities`
- `safety class`
- `owner`
- `availability`

## 3. Channel Layer

Channels are project-level signals.

A channel must not care whether its source is local or remote.

Channel attributes:

- `id`
- `data type`
- `engineering units`
- `source`
- `quality`
- `mode`
- `conditioning chain`

Channel source types:

- local I/O
- external ADC/DAC
- Modbus register
- RS232/RS485 parser value
- CAN/TWAI value
- virtual/computed source
- manual substitute source

Channel quality states:

- `good`
- `stale`
- `substituted`
- `fault`
- `out_of_range`

Channel modes:

- `auto`
- `manual`
- `local`
- `remote`
- `service`

## 4. Conditioning Layer

Conditioning turns raw values into usable process signals.

Required conditioning blocks:

- scale
- offset
- clamp
- deadband
- hysteresis
- debounce
- low-pass filter
- moving average
- rate limit
- plausibility check
- source select
- substitute
- range map
- piecewise map

Example:

`4-20 mA raw -> scaled temperature -> filtered -> clamped -> validated -> selected for control`

## 5. Control Block Layer

Blocks operate on channels and produce channels or actions.

Required blocks:

- PID
- Timer
- Comparator
- Window comparator
- Latch
- Logic gate
- Selector
- Ramp/Soak
- Analog Mapper
- Alarm
- Flow / Frequency / Totalizer
- Protocol Gateway

Block rules:

- block inputs and outputs are named channel IDs
- blocks do not own GPIO numbers
- blocks report status and errors
- blocks support service visibility in UI

## 6. Sequence Layer

Sequences are required for complex mechanisms.

A sequence is an explicit state machine.

Typical states:

- `Idle`
- `Ready`
- `Precheck`
- `Prepurge`
- `Ignition`
- `Warmup`
- `Run`
- `Cooldown`
- `Fault`
- `Lockout`
- `Service`

Each state defines:

- required permissives
- outputs forced or enabled
- timers
- alarms allowed or suppressed
- transition conditions
- fault transitions

This layer is mandatory for:

- boiler logic
- incinerator logic
- any mechanism with startup and shutdown phases

## 7. Safety Layer

Safety must not be embedded implicitly inside random blocks.

Safety entities:

- permissives
- trips
- interlocks
- latched alarms
- safe-state policy
- watchdog policy
- comm-loss policy
- sensor-fault policy

Safety outputs:

- stop output
- lockout
- require reset
- enter service-only mode

## 8. Communications Layer

Communications are not "extra drivers".

They are signal transport and device integration mechanisms.

Required structure:

- bus manager
- port configuration
- protocol drivers
- remote device templates
- imported/exported channel bindings

V1 buses:

- RS485 / Modbus RTU
- Modbus TCP
- RS232
- RS422

Later buses:

- CAN/TWAI
- NMEA2000 abstraction

## 9. Service and UI Layer

The Web UI is part of the product architecture.

Primary UI sections:

- Overview
- Hardware
- Signals
- Blocks
- Sequences
- Diagnostics
- Trends
- Service
- Network

The UI must support:

- configuration
- live values
- diagnostics
- force/simulate
- parameter tuning
- event visibility
- backup/restore

## 10. Local HMI Layer

Local UI is lightweight but configurable.

Supported interaction types:

- plain buttons
- debounced keys
- resistive keyboard ladders
- rotary encoder-ready inputs

Supported outputs:

- small OLED/LCD dashboards
- configurable screen sets
- key process values
- alarm indication

## Runtime Managers

The runtime should be organized around a small number of clear managers.

Required managers:

- `TemplateManager`
- `BoardManager`
- `ResourceManager`
- `BusManager`
- `ChannelRegistry`
- `BlockEngine`
- `SequenceEngine`
- `AlarmManager`
- `EventLog`
- `ServiceRuntime`

## Recommended Runtime Loop

The control loop should be structured logically, even if internally split by task.

Reference flow:

1. Read local and remote inputs
2. Update channel conditioning
3. Evaluate safety conditions
4. Execute blocks
5. Execute sequences
6. Update outputs
7. Update diagnostics and service data
8. Handle communications and UI

## Data Model Requirements

Every important runtime object should be inspectable from the Web UI.

Required observable objects:

- resources
- channels
- blocks
- active sequence state
- alarms
- events
- signal quality
- substitutions
- communication status

## Configuration Model

The config model should be versioned and split conceptually into:

- system
- templates
- hardware
- channels
- blocks
- sequences
- UI
- service/network

The system must support:

- export/import
- backup/restore
- version migration
- validation before apply

## V1 Scope

The first serious product release should include:

- stable core runtime
- DI/DO/AI/AO signal handling
- conditioning blocks
- PID
- alarms
- sequence engine
- Modbus RTU/TCP
- service-oriented Web UI
- configurable local display pages

## Explicit Non-Goals For V1

The platform does not need for V1:

- a heavy graphical HMI
- deep local historical storage
- large analytics workloads
- many simultaneous complex protocols
- a full IEC editor clone

## Architecture Decision

ESP32 is accepted as the CPU platform for V1 and medium-complexity product variants.

If the product later grows beyond current platform limits, the architecture must allow:

- stronger CPU modules
- richer service/UI modules
- external communication expansion

without breaking the higher-level model described in this document.
