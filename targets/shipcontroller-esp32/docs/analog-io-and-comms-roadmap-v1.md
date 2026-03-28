# Analog I/O And Communications Roadmap v1

## Purpose

This document defines the practical implementation order for:

- analog input and output handling
- signal conditioning at the I/O layer
- future communication buses and external devices

It exists to answer two questions before feature growth:

1. what should be built next after the current `blocks + display` baseline
2. how to prepare Modbus, UART, I2C and similar buses without building them on a weak signal foundation

The main principle is:

`first condition local signals well, then extend them over buses`

## Current Position

Already implemented:

- signal registry
- derived and block-produced signals
- `timer`, `button`, `latch`, `selector`, `comparator`, `scale_map`
- display model as a view over signals
- scenario-first block editor

This means the platform can already do:

- timing
- simple control logic
- comparison
- analog conditioning inside logic blocks
- local display binding

What is still weak:

- human-friendly analog input setup
- engineering profiles for AI/AO
- calibration and filtering at the channel layer
- quality and comm-state handling for future external signals
- bus/device model for protocol-based sources and sinks

## Recommended Order

### Step 1: Analog I/O v1

This is the recommended next major step.

Why:

- it closes the biggest gap in `Stage 2: Industrial I/O`
- it strengthens `display`, `comparator`, and future `alarm`
- it provides the correct signal foundation before communication buses import/export values

Scope:

- AI channel setup
- basic AO channel setup
- engineering units and scaling
- clamp and filtering
- calibration flow
- live raw/scaled/conditioned preview

Follow-up after Analog I/O v1:

- `Guided Calibration v1`
  - two-point calibration wizard
  - known-reference calibration
  - domain-specific calibration flows such as flowmeter known-volume setup
  - apply/rollback workflow

### Step 2: Communications Foundation v1

Only after Analog I/O v1 is stable.

Why:

- buses should publish into a mature signal model
- external values need the same quality, timestamp and engineering semantics as local values

Scope:

- bus/port model
- device model
- poll scheduler
- communication quality/status model
- signal import/export mapping

Current implementation note:

- the practical stage spec is now fixed in `docs/comms-foundation-spec-v1.md`
- the next code slice should start only with:
  - bus config
  - device config
  - runtime registries
  - basic API/UI
- actual protocol logic and chip drivers should wait for the shared model to become real

### Step 3: External Analog Delivery Pack

After the shared communications foundation is in place, the next agreed staged order is:

1. `External Analog UX Pack v1`
2. `Device Template Pattern v1`
3. `External DAC v1`
4. `Modbus RTU v1`

Why:

- external analog should become product-ready before deeper protocol work
- device-template growth should become repeatable before introducing Modbus complexity
- the first external DAC should validate external output through the same shared model
- then `Modbus RTU` can enter as a stronger protocol-backed extension of an already stable architecture

Recommended first external DAC direction:

- a multi-channel I2C DAC such as `MCP4728`

Only after this staged pack:

- expand to more `I2C`/`SPI` device templates
- add additional UART/serial device patterns

## Analog I/O v1

### Goal

Make analog signals usable from configuration and UI without manual firmware edits.

### AI v1 Deliverables

- analog input channel type with live raw value
- engineering input profile:
  - `raw/custom`
  - `0-10V`
  - `4-20mA`
  - `0-20mA`
- engineering range:
  - raw minimum
  - raw maximum
  - engineering minimum
  - engineering maximum
  - units
- optional invert
- optional clamp
- optional simple low-pass / smoothing filter
- optional deadband or hysteresis where helpful
- quality and status fields:
  - `good`
  - `stale`
  - `fault`
- calibration entry points:
  - two-point calibration minimum
  - offset/scale correction

### Guided Calibration v1

This is not the first Analog I/O step, but it should be planned immediately after the base analog model is stable.

Why:

- it depends on a correct raw/scaled/conditioned signal path
- it is closer to commissioning UX than to low-level runtime math
- it is a major product differentiator for real technicians

Target flows:

- known-reference low point
- known-reference high point
- direct offset trim
- flowmeter known-volume calibration
- save/apply/rollback

Current implementation note:

- the first lightweight slice is now started in the `Channels` analog editor
- it currently supports:
  - two-point calibration capture from live raw values
  - engineering low/high reference entry
  - apply-to-range
  - rollback to the current editor snapshot
- the editor now also guides the operator through the next calibration step and prevents premature apply when the captured points are not valid yet
- the current assistant now already exposes a practical commissioning sequence:
  - capture low
  - capture high
  - apply
  - check result
  - save
- the assistant is now also state-aware, so the operator can immediately see whether the points are captured, the scale is already applied, and whether the form still has unsaved changes
- this is intentionally a commissioning-safe assistant layer, not yet a full wizard

### AO v1 Deliverables

- analog output channel type
- engineering setpoint handling
- engineering profile selection
- raw output preview
- safe startup/default output value
- optional clamp and write enable policy

### AI/AO UI v1

The UI should not start from raw ADC math.

It should start from:

- signal source
- electrical type
- engineering range
- units
- live preview

Recommended editor sections:

- Source / Electrical profile
- Engineering range
- Conditioning
- Calibration
- Live preview
- Advanced

### AI/AO Signal Model

Each analog point should expose at least:

- raw value
- scaled value
- units
- quality
- status
- timestamp

This keeps local analog signals aligned with future bus-imported analog signals.

## Communications Foundation v1

### Goal

Create a common transport and device layer before protocol-specific growth.

### Required Models

#### 1. Bus / Port Model

Examples:

- `uart1`
- `rs485_1`
- `i2c_1`
- later `can_1`

Parameters:

- tx/rx pins
- baud rate
- parity
- stop bits
- RS485 direction pin if used
- I2C SDA/SCL/speed

#### 2. Device Model

Examples:

- Modbus slave device
- I2C ADC
- UART text/binary sensor

Parameters:

- bus reference
- address / slave ID / device ID
- poll period
- timeout
- retry count
- online state

#### 3. Signal Mapping Model

This is the critical layer.

It should support:

- external register -> signal
- signal -> coil/register/output

Examples:

- `modbus:40001 -> tank_level_raw`
- `pump_enable_cmd -> modbus coil 00001`

#### 4. Communication Quality Model

All imported signals should carry:

- `good`
- `stale`
- `comm_loss`
- `fault`
- timestamp

This is required so that `display`, `alarm`, `selector` and future `sequences` can behave safely.

#### 5. Poll Scheduler

Requirements:

- no blocking of the main control loop
- different poll periods per device
- retries and backoff
- visible diagnostics

## Modbus RTU v1

Recommended first protocol implementation.

### Scope

- RS485 port definition
- Modbus RTU slave device definition
- register/coil mapping to signals
- online/offline device state
- timeout/retry counters
- diagnostics page with:
  - last response
  - error count
  - online status

### Out of Scope for v1

- heavy protocol editor
- complex frame monitor
- advanced gateway rules
- Modbus TCP

## I2C v1

I2C should come after the shared bus/device foundation.

Recommended first use cases:

- external ADC
- external DAC
- display peripherals
- simple digital expanders

It should reuse the same ideas:

- port
- device
- mapping
- status

See also:

- `docs/external-adc-dac-roadmap-v1.md`

## Why This Order Is Recommended

If communications are built before Analog I/O:

- external signals will arrive into a weaker engineering model
- the UI will still be poor for local analog points
- alarm and display logic will later need rework

If Analog I/O comes first:

- both local and remote signals can use the same engineering semantics
- `scale_map`, `comparator`, `display` and future `alarm` get stronger immediately
- the bus layer plugs into a cleaner signal architecture

## Next Recommended Implementation Sequence

1. `Analog I/O v1`
2. `Guided Calibration v1`
3. `Communications Foundation v1`
4. `External Resource Model v1`
5. `External ADC/DAC v1`
6. `Modbus RTU v1`
7. then `Alarm v1`

This is the current recommended path unless product priorities change.

## Current Status

The first communications foundation slice is now in place:

- buses
- devices
- runtime status registry
- basic API
- first Web UI tab

The shared external-resource model is now also in place:

- external resources
- runtime state for external resources
- API for external resources
- `Comms` UI support

That means the shared channel/resource integration step is now also in place:

- channels can bind to external resources
- the same `channel -> signal` model is reused for local and external sources
- the channel editor can now choose local GPIO or external resource

The next safe step is therefore not direct protocol work yet, but:

- keep the first real external device template stable:
  - `ADS1115 v1`
- improve visibility and commissioning around external analog values
- then add the next device template or protocol work through the same shared model

Current implementation note:

- `ADS1115 v1` is now the first real external device template
- devices with `driver = ads1115` can now poll external resources with:
  - `kind = analog_in`
  - `capability = ai`
  - `source_index = 0..3`
- commissioning for the first device template is now easier too:
- the `Comms` device editor can seed `ch0..ch3` for `ADS1115` in one step
- this keeps the shared model intact while removing repetitive manual setup
- because the first real external ADC board is not physically available right now, the next safe validation step is:
  - `virtual_ai v1`
  - a no-hardware external analog device template
  - used to validate the full shared path before adding more real ADC drivers
- those raw values now flow through:
  - external resource runtime
  - normal channel binding
  - normal signal publishing
- current deliberate limitation:
  - only the primary configured I2C bus is active in `v1`
