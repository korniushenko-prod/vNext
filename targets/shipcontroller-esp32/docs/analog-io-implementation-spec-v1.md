# Analog I/O Implementation Spec v1

## Purpose

This document defines the first safe implementation slice of Analog I/O.

The main rule for this phase is:

- add analog engineering metadata first
- expose it in config and Web UI
- keep the current raw runtime path stable

This avoids a large refactor while creating the correct foundation for:

- guided calibration
- display formatting
- comparator/alarm usage
- future bus-imported analog values

## Scope Of This First Slice

Included now:

- `ChannelConfig` support for analog metadata
- config loader support for analog metadata
- `/channels` API exposure of analog metadata
- `/channel-binding` save path for analog metadata
- Web UI editor fields for `AI` and `AO`

Not included yet:

- runtime conditioning pipeline
- engineering-value publishing for resource-backed AI/AO signals
- advanced filtering
- calibration wizard
- analog trends/service pages

## Channel Model

Analog-capable channels should support these shared fields:

- `profile`
- `units`
- `raw_min`
- `raw_max`
- `eng_min`
- `eng_max`
- `offset`
- `scale`
- `clamp_min`
- `clamp_max`
- `clamp_enabled`
- `filter`
- `filter_alpha`
- `startup_value`

Expected usage:

- `AI` uses all fields except `startup_value`
- `AO` uses the same range model and may also use `startup_value`

## Profiles v1

Supported profile strings:

- `raw`
- `0_10v`
- `4_20ma`
- `0_20ma`
- `custom`

These are metadata only in this slice.

## API Contract

### GET `/channels`

Each analog channel should expose:

- base digital/shared fields
- analog metadata fields

This allows the editor to reopen and preserve analog settings.

### POST `/channel-binding`

The channel save request should accept flat analog metadata fields together with:

- `channel_id`
- `type`
- `gpio`
- `inverted`
- `pullup`
- `initial`

The analog save path must be tolerant:

- non-analog channels may omit analog fields
- analog channels may use defaults when fields are missing

## Web UI

The `Channels` editor should stay simple and grouped.

Sections:

1. Basic channel identity
2. Digital behavior
3. Analog setup
4. Analog output startup

Visibility rules:

- `DI`: show `pullup`, hide analog setup
- `DO`: show `initial`, hide analog setup
- `AI`: show analog setup, hide `pullup` and `initial`
- `AO`: show analog setup and startup value

## Runtime Staging

Phase 1:

- config + API + UI only
- raw runtime unchanged

Phase 2:

- add conditioning pipeline
- publish engineering values and units

Phase 3:

- guided calibration
- service preview and trends

## Success Criteria For This Slice

- analog channel metadata survives save/load
- `AI` and `AO` can be configured from the Web UI
- no regression in current channel runtime behavior
- future conditioning can be attached without redesigning the editor or config
