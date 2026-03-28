# External ADC/DAC Roadmap v1

## Purpose

This document defines how external multi-channel ADC and DAC devices should enter the platform.

The key rule is:

`do not add external ADC/DAC as one-off hacks`

They must fit the same system model as:

- local resources
- channels
- signals
- display
- future communications

## Why This Matters

External analog expansion is needed for:

- more AI channels than the ESP32 can safely provide
- cleaner industrial front-ends
- multi-channel current/voltage measurement
- multi-channel analog output
- future remote and protocol-backed analog sources

## Recommended Order

### Step 1. Communications Foundation v1

Before any specific ADC/DAC chip:

- bus / port model
- device model
- polling scheduler
- online / fault state
- signal quality and timestamp model

Without this, every new chip becomes a custom hack.

### Step 2. External Resource Model v1

Introduce external resources that look like normal resources to the rest of the system.

Examples:

- `ads1115_1.ch0`
- `ads1115_1.ch1`
- `mcp4728_1.ch0`

This allows:

- channels to bind to local GPIO resources or external resources
- display and blocks to stay unchanged
- future cleanup / where-used / diagnostics to work consistently

### Step 3. First External ADC Template

Recommended first target:

- `ADS1115`

Why:

- common
- useful
- multi-channel
- a good fit for marine instrumentation and analog expansion

Current status:

- `ADS1115 v1` is now the first implemented real external device template
- devices with `driver = ads1115` can now poll exported `analog_in` resources with `source_index = 0..3`
- the resulting raw values now flow through:
  - external resource runtime
  - channel binding
  - normal signal publishing
- `virtual_ai v1` is now approved as the no-hardware commissioning device template:
  - it should let the platform test `bus -> device -> external resource -> channel -> signal -> display`
  - it exists to validate architecture and UX without a physical ADC board
- this is intentionally still a narrow `v1`:
  - only the primary configured I2C bus is active
  - only raw analog input polling is implemented
  - no DAC or richer device-parameter UI has been added yet

Preferred ADC shortlist after the first stable templates:

- `ADS1115`
- `ADS1015`
- `MCP3008`
- `PCF8591`

Rule:

- do not add several real ADC drivers in one burst
- keep one real device template stable first
- use `virtual_ai` when hardware is missing
- then add the next popular ADC through the same shared model

### Step 4. First External DAC Template

Recommended first target:

- a multi-channel I2C DAC such as `MCP4728`

Why:

- good for staged analog output support
- naturally validates the same device/resource model

## Required Architecture

### 1. Bus / Port Model

Initial focus:

- `i2c_1`
- later `spi_1`

Fields:

- `id`
- `type`
- `sda`
- `scl`
- `speed`
- `enabled`

### 2. Device Model

Examples:

- `ads1115_1`
- `mcp4728_1`

Fields:

- `id`
- `driver`
- `bus`
- `address`
- `channel_count`
- `poll_ms`
- `enabled`
- `online`

### 3. External Resource Model

Each device exports resources per hardware channel.

Examples:

- `ads1115_1.ch0`
- `ads1115_1.ch1`
- `mcp4728_1.ch0`

Each resource should carry:

- source device
- channel index
- capability
- online status

### 4. Signal And Quality Model

Imported analog signals must follow the same shape as local analog signals:

- `raw`
- `engineering`
- `units`
- `quality`
- `status`
- `timestamp`

### 5. Diagnostics

Each external device should expose:

- online/offline
- last successful update
- error count
- current address
- current bus

## UI Direction

The UI should not jump straight to a chip-specific editor.

It should grow in layers:

1. `Buses`
2. `Devices`
3. `Channels`

For channels, the user should later choose:

- local GPIO resource
- external ADC resource
- external DAC resource

## What To Avoid

- hardcoding one ADC into channel code
- tying device configuration directly to block logic
- making display depend on chip-specific paths
- duplicating a second analog model for external devices

## First Safe Implementation Step

Do next:

- define `Communications Foundation v1` structs and API shape
- define `external resource` concept
- keep actual chip drivers for the next step

This is the correct point to begin after the current local Analog I/O baseline.

That architectural step is now complete enough to support the first real ADC template, so the next safe work is:

- stabilize `ADS1115 v1`
- add and use `virtual_ai v1` for no-hardware commissioning
- improve commissioning visibility for external analog values
- then add the next external device template or richer transport logic
