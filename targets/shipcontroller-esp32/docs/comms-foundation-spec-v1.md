# Communications Foundation Spec v1

## Purpose

This document defines the first practical shared architecture for:

- I2C
- UART / RS485
- future external devices
- future external ADC/DAC resources
- the first protocol-backed channels such as Modbus RTU

The goal is to prevent protocol growth from becoming a set of unrelated custom integrations.

## Core Principle

All external connectivity should follow this chain:

`bus -> device -> external resource -> channel -> signal`

That means:

- a bus transports data
- a device lives on a bus
- a device exposes resources
- channels bind to resources
- signals publish values

This must stay true for:

- local GPIO resources
- external ADC/DAC channels
- protocol-backed registers/coils
- future remote engineering values

## Stage Goal

`Communications Foundation v1` is not yet a protocol implementation.

It should deliver:

- a shared config model for buses and devices
- a runtime model for online/offline device state
- a shared external resource concept
- a basic polling scheduler contract
- quality/status/timestamp semantics for external values
- enough UI/API structure that the first real protocol can enter cleanly

It should not yet deliver:

- a full Modbus stack
- a full I2C chip library
- deep diagnostics screens
- fieldbus-specific editors

## Stage Gate

This stage is done enough to move on when:

- bus config survives save/load
- devices survive save/load
- external resources can exist in runtime without special-case hacks
- device runtime state is visible
- the platform can attach the first protocol or first external ADC/DAC without redesigning the model

## Required Models

### 1. Bus

Examples:

- `i2c_1`
- `rs485_1`
- `uart_1`

Common fields:

- `id`
- `type`
- `enabled`
- `label`

Type-specific fields:

- `i2c`: `sda`, `scl`, `speed`
- `uart`: `tx`, `rx`, `baud`, `parity`, `stop_bits`
- `rs485`: `tx`, `rx`, `baud`, `parity`, `stop_bits`, `de_pin`

Runtime state:

- `initialized`
- `status`
- `last_error`

### 2. Device

Examples:

- `modbus_1`
- `ads1115_1`
- `mcp4728_1`

Fields:

- `id`
- `driver`
- `bus_id`
- `enabled`
- `address`
- `poll_ms`
- `timeout_ms`
- `retry_count`
- optional `label`

Runtime state:

- `online`
- `last_ok_ms`
- `last_poll_ms`
- `error_count`
- `status`

### 3. External Resource

Examples:

- `ads1115_1.ch0`
- `mcp4728_1.ch2`
- `modbus_1.reg_40001`
- `modbus_1.coil_00001`

Fields:

- `id`
- `device_id`
- `kind`
- `capability`
- `source_index`
- optional `units`
- optional `label`

Capabilities:

- `ai`
- `ao`
- `di`
- `do`
- later others as needed

Kinds:

- `analog_in`
- `analog_out`
- `digital_in`
- `digital_out`
- `register`
- `coil`

Runtime state:

- `online`
- `quality`
- `status`
- `timestamp_ms`

## Channel Binding Rule

Channels should later bind to:

- local resource
- external resource

The rest of the platform should not care which one it is, as long as the resource publishes the correct signal semantics.

This is a hard rule.

Do not create:

- one channel model for local GPIO
- another channel model for protocol devices

## Signal Rule

External analog values must look like local analog values:

- raw value
- engineering value
- units
- quality
- status
- timestamp

External digital values must look like local digital values:

- bool value
- raw value
- quality
- status
- timestamp

This is mandatory for:

- display
- blocks
- future alarms
- future guided calibration

## Quality And Status Contract

At minimum, external values should support:

- `good`
- `stale`
- `fault`
- `comm_loss`

And device status should support:

- `online`
- `offline`
- `timeout`
- `error`
- `disabled`

## Polling Scheduler Contract

The scheduler does not need to be complex in v1, but it must exist as a shared concept.

Each device should have:

- `poll_ms`
- `timeout_ms`
- `retry_count`

The scheduler should:

- avoid blocking the main control loop more than necessary
- allow different devices to poll at different intervals
- update device online/offline state
- update external resource timestamps and quality

V1 can be cooperative and simple.

It does not need:

- advanced backoff logic
- priority queues
- dynamic jitter control

## API Direction

V1 should expose enough structure for the Web UI and future diagnostics.

Recommended routes:

- `GET /buses`
- `POST /bus`
- `POST /bus-delete`
- `GET /devices`
- `POST /device`
- `POST /device-delete`
- `GET /external-resources`

Route payloads should be config-oriented, not raw driver internals.

## UI Direction

The UI should grow in layers:

1. `Buses`
2. `Devices`
3. `Channels`

Do not start from a chip-specific configuration screen.

The user journey should be:

1. create bus
2. attach device to bus
3. see exported resources
4. bind channel to resource

### UI v1 sections

#### Buses

- list of configured buses
- add/edit/delete bus
- show bus type and physical pins
- show runtime status

#### Devices

- list of devices
- add/edit/delete device
- bind device to bus
- show address, polling, timeout
- show online/offline state

#### External Resources

- read-only list in v1
- show exported resource id
- capability
- device
- online/quality

#### Channels

- later extend channel editor to choose:
  - local GPIO resource
  - external resource

## Configuration Direction

The config model should prepare for migrations.

Recommended top-level direction:

```json
{
  "buses": {
    "i2c_1": {
      "type": "i2c",
      "enabled": true,
      "sda": 21,
      "scl": 22,
      "speed": 400000
    }
  },
  "devices": {
    "ads1115_1": {
      "driver": "ads1115",
      "bus_id": "i2c_1",
      "enabled": true,
      "address": 72,
      "poll_ms": 200,
      "timeout_ms": 100,
      "retry_count": 2
    }
  }
}
```

The exact key names may evolve, but the model should remain:

- config-first
- migration-aware
- bus/device/resource separated

## First Safe Implementation Slice

The first code slice should be intentionally narrow:

### Backend / Config

- bus config structs
- device config structs
- loader/save path

### Runtime

- bus runtime registry
- device runtime registry
- empty external resource container

### API

- `GET /buses`
- `POST /bus`
- `GET /devices`
- `POST /device`

### UI

- simple `Buses` and `Devices` lists/editors
- no chip-specific forms yet

This slice should not yet include:

- real Modbus polling
- real ADS1115 driver
- channel binding to external resources

## Current Status

The first safe slice is now implemented in the project:

- top-level `buses` and `devices` config sections exist
- runtime has a compact bus/device registry
- basic CRUD API exists for buses and devices
- the file-based Web UI has a first `Comms` tab
- top-level `external_resources` config now also exists
- runtime now tracks shared external-resource state
- the `Comms` tab can now view and edit external resources too

This means the next sub-step should move to the shared external-resource model, not jump straight into protocol-specific logic.

That sub-step is now also in place too:

- channels can now bind to external resources through the same shared resource path as local GPIO resources
- the `Channels` editor now exposes a source selector for local GPIO vs external resource
- external-resource-backed channels now flow through the normal `channel -> signal` model

So the next safe step is:
- first real device templates
- first real external polling/value updates

That next safe step is now partially in place too:

- the first real external device template is `ADS1115 v1`
- external `analog_in` resources exported by an `ads1115` device can now publish real raw values
- channels bound to those external resources now read real values through the same shared channel path
- first-device commissioning is now lighter too:
  - the `Comms` device editor can seed `ADS1115 ch0..ch3` as external resources
  - this is intentionally a helper layer on top of the shared model, not a special-case channel path

Current limitation:

- only the primary configured I2C bus is active in `v1`
- this is still intentionally narrower than a full shared transport layer

## Next Step After Foundation

Once this stage is in place, the correct next entries are:

1. keep `ADS1115 v1` stable as the first real device template
2. add the next external device template through the same shared model
3. then `Modbus RTU v1`

The order matters.

Do not jump straight to Modbus registers before the shared bus/device/resource model is real.
