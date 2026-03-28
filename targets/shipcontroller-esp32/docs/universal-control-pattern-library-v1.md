# Universal Control Pattern Library v1

## Purpose

This document fixes the product direction as:

- not `boiler-first`
- not `mechanism-specific-first`
- but `universal control-pattern-first`

The controller should be able to cover:

- boiler automation
- flowmeter packages
- compressor start/stop and standby alternation
- BWTS subsystems such as pumps, valves, dosing, UV/filter support logic
- generic marine machinery and auxiliary automation

The mechanism is only a composition.

The reusable product core should be a library of universal patterns.

## Core Rule

The platform should not grow around:

- vendor-specific devices
- one-off boiler screens
- one mechanism template as the primary abstraction

The platform should grow around:

- universal signal patterns
- universal control patterns
- universal actuation patterns
- universal policy patterns
- universal orchestration patterns

## Pattern Layers

The recommended stack is:

1. `IO / Transport`
2. `Normalized Signals`
3. `Primitive Blocks`
4. `Universal Control Patterns`
5. `Functional Modules`
6. `Composite Mechanisms`

This means:

- patterns are more universal than mechanism templates
- mechanisms should be assembled from patterns
- boiler remains a strong pilot, but not the main product type

Reference:

- `docs/universal-block-base-v1.md`
- `docs/custom-module-authoring-v1.md`
- `docs/flowmeter-pattern-pack-v1.md`

## Pattern Families

### 1. Operator Interaction Patterns

Use for:

- pushbuttons
- selector switches
- local/remote commands
- service station inputs

Examples:

- button short/long/double press
- maintained selector
- mode select
- reset / acknowledge

### 2. Measured Value Patterns

Use for:

- temperature
- pressure
- level
- flow
- conductivity / salinity / TDS
- switch / limit state

Common outputs:

- `value`
- `ready`
- `fault`
- `alarm`
- `in_range`
- `quality`

These patterns should not care whether the source is:

- float switch
- `4-20 mA`
- local ADC
- Modbus
- satellite

### 3. Condition / Decision Patterns

Use for:

- threshold
- window
- hysteresis
- deadband
- comparator
- state validity

Examples:

- temperature above threshold
- pressure below start level
- level inside allowed band
- value stale / fresh

### 4. On/Off Control Patterns

Use for:

- start/stop by thresholds
- hysteresis-based control
- anti-chatter
- anti-slosh
- min on/off timing

Examples:

- boiler water-level feed pump control
- compressor start by low pressure
- compressor stop by high pressure
- blowdown valve periodic opening

This family is explicitly different from PID.

### 5. PID / Modulating Control Patterns

Use for:

- temperature loop
- pressure loop
- analog setpoint loop
- modulating actuator control

Examples:

- fuel heater PID
- pressure regulation
- chemical dosing setpoint control
- modulating damper or valve loop

### 6. Actuator Patterns

Use for:

- contactor-driven pumps and fans
- solenoids
- reversible motors
- motorized valves
- positioners
- PWM-driven loads
- future steppers / servos

Capability direction:

- `discrete_onoff`
- `fast_pwm`
- `slow_pwm`
- `reversible_open_close`
- `analog_setpoint`
- `protocol_setpoint`
- `protocol_position`
- `stepper_position`
- `servo_position`

### 7. Alternation / Duty Patterns

Use for:

- duty / standby
- lead / lag
- N+1 redundancy
- equal run-time rotation

Examples:

- one or two compressors based on pressure demand
- standby pump alternation
- boiler auxiliary pump rotation
- BWTS pump duty/standby groups

### 8. Totalizer / Accumulator Patterns

Use for:

- pulse counting
- volume totalization
- lifetime counters
- resettable counters
- persistent totals

Examples:

- flowmeter volume
- flowmeter mass after conversion
- runtime counters
- cycle counters

This family should directly support future flowmeter work.

### 9. Conversion / Compensation Patterns

Use for:

- scaling
- engineering unit conversion
- density compensation
- mass conversion
- temperature compensation
- lookup / profile correction later

Examples:

- liters to metric tons
- conductivity compensation
- position scaling
- process-value normalization

### 10. Authority / Takeover Patterns

Use for:

- local / remote
- auto / manual / service
- internal / external ownership
- fallback takeover
- shadow mode

Examples:

- internal PID replacing failed external controller
- remote command ownership
- manual override during service

### 11. Interlock / Permissive / Trip Patterns

Use for:

- permissives
- inhibits
- trips
- lockout
- grouped stop policy

Examples:

- low-low water trips burner
- fan fault inhibits ignition
- low fuel temp warning only
- BWTS fault chain

### 12. Sequence / Phase Patterns

Use for:

- startup
- shutdown
- purge
- ignition
- cooldown
- wash cycle
- valve movement scenario

Use sequence when the logic has:

- named phases
- transitions
- timeouts
- waiting reasons
- fault reasons

Do not use sequence for every simple threshold-based control loop.

### 13. Supervision / Freshness Patterns

Use for:

- feedback timeout
- stale input
- comm loss
- must-have / must-not-have supervision

Examples:

- flame required during burn
- flame forbidden after stop
- sensor stale
- Modbus comm loss

### 14. Alarm / Event Presentation Patterns

Use for:

- warning-only paths
- trip-causing faults
- ack-required alarms
- recent events
- service summaries

Examples:

- low fuel temperature warning
- low-low water trip
- pump fail to start
- BWTS dosing alarm

## Cross-Mechanism Coverage

### Boiler

Covered by:

- measured values
- on/off control
- PID
- actuators
- supervision
- permissives / trips
- sequences
- authority / takeover

### Flowmeter

Covered by:

- measured value
- condition / decision
- totalizer / accumulator
- conversion / compensation
- alarm / policy

Reference:

- `docs/flowmeter-pattern-pack-v1.md`

### Reusable User Authored Logic

Covered by:

- custom modules
- standard block base
- standard sequence and alarm policies

Reference:

- `docs/custom-module-authoring-v1.md`

### Compressor Automation

Covered by:

- pressure measured value
- threshold / window
- on/off control
- duty / standby alternation
- actuator
- trip policy
- optional startup sequence

### BWTS / Technocross-like Systems

Covered by:

- pumps / valves / positioners
- measured values
- dosing or modulating loops
- permissives / trips
- wash or treatment sequences
- duty/standby packages
- service and event presentation

## Product Consequence

The product should therefore expose:

- a universal pattern library first
- mechanism recipes second
- mechanism-specific presets only as guided compositions

Correct order:

1. universal pattern families
2. module templates built from those patterns
3. composite recipes such as boiler, flowmeter, compressor station, BWTS train

Incorrect order:

1. build boiler-only model first
2. clone it into other mechanisms later

## UX Consequence

The future UI should guide users through:

- pattern choice
- module configuration
- composition into a mechanism

not through:

- raw helper chains as the default
- one giant vendor-specific mechanism screen

## Immediate Direction

Next architectural focus should be:

- stabilize this universal pattern library
- align module templates with it
- keep boiler as a reference validation case
- avoid hardcoding future UI around boiler-only semantics
