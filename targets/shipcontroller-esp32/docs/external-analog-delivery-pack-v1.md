# External Analog Delivery Pack v1

## Purpose

This document groups the next agreed communications/analog work into one delivery line.

It exists to keep the project from jumping between:

- random device drivers
- protocol work too early
- UI polish without runtime progress

The agreed order is:

1. `External Analog UX Pack v1`
2. `Device Template Pattern v1`
3. `External DAC v1`
4. `Modbus RTU v1`

## Why This Order

The platform already has:

- local analog conditioning
- channels/signals/blocks
- communications foundation
- external resources
- first real external ADC template
- first no-hardware external analog template

What is still weak is not the raw architecture, but the product path around it.

So the next steps should:

- make external analog easy to commission
- make device templates repeatable
- add the first external DAC through the same model
- only then move into Modbus

This avoids:

- adding many one-off drivers
- building Modbus on a weak device-template UX
- growing protocol work before external analog is product-ready

## Phase 1: External Analog UX Pack v1

Goal:

- make external analog feel as usable as local analog

Scope:

- better `Comms` editor flow for external analog devices
- driver-aware notes and quick actions
- easier external resource creation
- clearer `Channels` source/preview/status for external analog
- easier `Display` binding for external analog signals
- better visibility of:
  - source device
  - raw value
  - engineering value
  - quality
  - status

Current implementation start:

- the first slice is now started with a direct `Bind` action from external resources into the `Channels` editor
- this is meant to reduce the manual gap between:
  - exporting a device resource
  - turning it into a real platform channel
- the second slice is now also in place:
  - `Comms` device editor is now more driver-aware
  - common drivers are selectable directly
  - there is now a `recommended fields` helper for driver-specific defaults
  - external resources now also have a direct `Display` shortcut that opens a prefilled display widget editor

Done enough when:

- an operator can create a device, export channels, bind one to `AI`, and see it on display/logic without guessing

Current transition rule:

- once the main external-analog path is usable without guessing, the repeated driver-specific behavior should be consolidated into `Device Template Pattern v1`
- that means:
  - one template registry
  - one place for device defaults
  - one place for resource defaults
  - one place for driver notes and quick actions

## Phase 2: Device Template Pattern v1

Goal:

- define one clean pattern for adding new external device drivers

Scope:

- driver-specific device fields
- driver-specific quick actions
- driver-specific defaults/notes
- shared template registry for supported drivers
- template-owned seed helpers and device-summary formatting
- shared editor pattern in `Comms`
- shared backend persistence pattern
- no special-case channel logic

This phase should make it easy to add:

- another ADC
- a DAC
- later a Modbus-backed device

Done enough when:

- a new external device template can be added without inventing a new UI/backend flow
- the current transition progress is now:
  - the frontend already uses a shared device-template registry for:
    - notes
    - defaults
    - seed labels
    - resource presets
    - device summary formatting
  - the backend seed helper is now also template-driven instead of hardcoding one-off branches for each current device
  - the first output-oriented template is now also connected to the same pattern:
    - `MCP4728`
    - generic seeding now supports `mcp4728_channels`
    - the same template path can now describe both:
      - input devices like `ADS1115`
      - output devices like `MCP4728`

## Phase 3: External DAC v1

Goal:

- add the first real external DAC through the same shared model

Recommended first target:

- a multi-channel I2C DAC such as `MCP4728`

Scope:

- DAC device template
- external `analog_out` resources
- binding to `AO` channels
- engineering setpoint path
- feedback/status visible in UI
- commissioning-safe defaults

Done enough when:

- an external DAC output can be configured and driven through the same `device -> external resource -> channel -> signal` model
- current implementation start:
  - `MCP4728` is now the first DAC template in the shared device-template registry
  - `Comms` seeding can now create `analog_out / ao` resources `ch0..ch3`
  - the runtime now has a first dedicated external analog write path
  - `ResourceManager` now routes external `AO` writes through `CommsRegistry`
  - `MCP4728` channel writes are compile-verified, but still pending real-hardware validation and commissioning polish
  - first commissioning polish is now also started:
    - `Channels` now prefers `raw 0..4095` for `MCP4728`
    - external `AO` can start with matching engineering range when no physical scale is defined yet
    - channel notes and preview now explain the external DAC path in user-facing terms
    - the operator can now see the last raw/status path of the external DAC resource directly while configuring the `AO` channel
    - the channel editor can now also jump directly to:
      - the linked external resource in `Comms`
      - a prefilled display widget for the saved channel
    - device rows in `Comms` can now also:
      - run template `Seed` directly
      - open a prefilled new external resource directly
    - direct commissioning write now exists for external `analog_out / ao` resources:
      - `Comms` can send a test raw value straight to the resource
      - `MCP4728` uses the expected `0..4095` quick range
      - this gives the first simple DAC bench-validation path before the full logic chain is involved
    - status readability is now better across `Comms` and `Channels`:
      - driver, last raw and write status are visible with much less drilling into editors
    - `Comms -> Devices` now also exposes a compact integration summary per device:
      - resources
      - ai/ao counts
      - linked channels/signals
      - display usage

## Phase 4: Modbus RTU v1

Goal:

- add the first protocol-backed external device class

Why only after Phase 3:

- by then the platform already has:
  - strong external analog UX
  - a reusable device-template pattern
  - both external input and output examples

That makes Modbus a natural extension of the same architecture instead of a parallel subsystem.

## Current Working Rule

Do not jump from the current stage directly to:

- many new ADC chips
- alarm work
- sequence work
- broad protocol expansion

Until this delivery pack is advanced in order.
