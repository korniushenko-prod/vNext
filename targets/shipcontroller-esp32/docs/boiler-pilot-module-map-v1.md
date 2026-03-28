# Boiler Pilot Module Map v1

## Purpose

This document maps the marine auxiliary boiler into the newly approved functional-module model.

It is not a vendor-exact wiring document.

It is the first pilot decomposition that should guide:

- future module-first UI
- future mechanism templates
- later boiler-specific visual authoring

## Boiler Pilot Goal

The platform should be able to cover boiler automation at multiple depths:

- replace one failed signal-processing element
- replace one failed local controller
- supervise an existing boiler subsystem
- eventually replace the main control role when hardware ownership allows it

## Pilot Module Stack

### 1. Operator IO Module

Purpose:

- start / stop pushbuttons
- auto / manual / service selectors
- reset / acknowledge controls
- lamp-style feedback import

Typical outputs:

- `boiler.start_cmd`
- `boiler.stop_cmd`
- `boiler.mode_auto`
- `boiler.mode_manual`
- `boiler.mode_service`
- `boiler.reset_cmd`

### 2. Fuel Temperature Measured Value Module

Purpose:

- normalize fuel temperature regardless of source:
  - analog
  - protocol
  - external controller telemetry

Typical outputs:

- `fuel_temp.value`
- `fuel_temp.ok`
- `fuel_temp.in_range`
- `fuel_temp.alarm_low`
- `fuel_temp.alarm_high`
- `fuel_temp.fault`

### 3. Fuel Temperature PID Control Module

Purpose:

- control fuel heater temperature with internal PID when required
- optionally follow or shadow an external controller

Typical inputs:

- `fuel_temp.value`
- `fuel_temp.sp`
- `boiler.mode_*`

Typical outputs:

- `fuel_pid.mv`
- `fuel_pid.ready`
- `fuel_pid.control_active`
- `fuel_pid.fault`
- `fuel_pid.alarm`

Backend direction:

- `internal_primary`
- `external_primary`
- `external_follow`
- `shadow`
- `fallback_takeover`

### 4. Fuel Source / Valve Actuator Module

Purpose:

- manage diesel / heavy-fuel source selection
- monitor three-way valve status and end-state confirmation

Capabilities:

- `discrete_onoff`
- later `reversible_open_close` if needed by the hardware

Typical outputs:

- `fuel_selector.position_diesel`
- `fuel_selector.position_hfo`
- `fuel_selector.ready`
- `fuel_selector.fault`

### 5. Draft / Air Measured Value Module

Purpose:

- normalize draft, pressure, or air proving signals

Typical outputs:

- `air.draft_ok`
- `air.pressure_ok`
- `air.fault`
- `air.ready`

### 6. Fan Actuator Module

Purpose:

- drive combustion fan through contactor output
- confirm run feedback and timeout

Capability:

- `discrete_onoff`

Typical outputs:

- `fan.running`
- `fan.ready`
- `fan.busy`
- `fan.fault`

### 7. Burner Actuator Module

Purpose:

- command burner enable path
- expose burner run / flame-related actuator state

Typical outputs:

- `burner.commanded`
- `burner.running`
- `burner.ready`
- `burner.fault`

### 8. Flame Measured Value Module

Purpose:

- normalize flame feedback source

Typical outputs:

- `flame.ok`
- `flame.present`
- `flame.fault`

### 9. Boiler Water Level Measured Value Module

Purpose:

- normalize drum/water level regardless of source:
  - float
  - analog level transmitter
  - protocol telemetry

Typical outputs:

- `level.value`
- `level.low`
- `level.high`
- `level.low_low`
- `level.high_high`
- `level.fault`
- `level.ready`

### 10. Feed Pump On/Off Control Module

Purpose:

- run feed-water pump from level logic without PID
- handle anti-chatter / anti-slosh behavior

Required behavior:

- hysteresis thresholds
- minimum run time
- minimum off time
- optional filtered level input
- optional alarm delay

Typical outputs:

- `feed_pump.request_on`
- `feed_pump.request_off`
- `feed_pump.blocked`
- `feed_pump.ready`
- `feed_pump.fault`

### 11. Feed Pump Actuator Module

Purpose:

- drive feed-water pump contactor
- watch run feedback

Capability:

- `discrete_onoff`

Typical outputs:

- `feed_pump.running`
- `feed_pump.ready`
- `feed_pump.busy`
- `feed_pump.fault`

### 12. Damper Actuator Module

Purpose:

- drive air/fuel damper or positioner
- support future multiple hardware styles

Capability direction:

- `reversible_open_close`
- `analog_setpoint`
- `stepper_position`
- `protocol_position`

Typical outputs:

- `damper.position`
- `damper.moving`
- `damper.ready`
- `damper.fault`

### 13. Water Chemistry Measured Value Module

Purpose:

- normalize conductivity / salinity / TDS sensing

Typical outputs:

- `water_chem.value`
- `water_chem.in_range`
- `water_chem.alarm_high`
- `water_chem.fault`

### 14. Blowdown Actuator Module

Purpose:

- command blowdown valve or blowdown function when chemistry policy requires it

Typical outputs:

- `blowdown.commanded`
- `blowdown.ready`
- `blowdown.fault`

### 15. Boiler Alarm Policy Module

Purpose:

- collect trips, lockouts, and operator-facing alarm groups

Typical grouped conditions:

- low-low water
- high water
- flame failure
- fan failure
- low fuel temperature
- draft failure
- controller comm loss
- chemistry alarm

### 16. Boiler Coordinator Sequence Module

Purpose:

- orchestrate the whole mechanism

Expected major states:

- `idle`
- `precheck`
- `fuel_warmup`
- `prepurge`
- `ignition`
- `flame_prove`
- `run`
- `postpurge`
- `fault`

Typical outputs:

- `boiler.running`
- `boiler.done`
- `boiler.fault`
- `boiler.current_state`
- `boiler.waiting_reason`
- `boiler.fault_reason`

## Pilot Composition Rules

The boiler pilot should follow these composition rules:

1. `Sequence` consumes module outputs, not vendor-specific device details.
2. Measured-value source transport is irrelevant once normalized.
3. PID backend may be internal or external without changing the coordinator sequence.
4. Feed-water level control remains an `On/Off Control Module`, not a PID loop.
5. Actuator modules should expose capability and feedback, not only raw outputs.

## High-Value Stress Cases

This pilot should cover at least these stress cases:

- external sensor replaced by local analog input
- external PID shadowed and later taken over internally
- feed-pump level control under sloshing/oscillating level
- fan contactor with failed run feedback
- damper hardware changing from simple open/close to position control
- trips and lockout surviving source/backend changes

## Why This Pilot Matters

If this boiler decomposition stays clean, then the same module-first approach should also scale to:

- incinerators
- pump stations
- tank systems
- heater loops
- remote smart subsystems
