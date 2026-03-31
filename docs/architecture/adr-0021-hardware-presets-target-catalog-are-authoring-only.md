# ADR-0021: Hardware Presets And Target Catalog Are Authoring-Only

## Status

Accepted

## Context

The hardware preset / target catalog track introduces:

- hardware catalog contracts in the authoring model
- target preset references for LilyGO T3 and ESP32-C3
- target-neutral hardware resolution in the materializer
- deterministic target-facing hardware summaries in the ESP32 adapter
- read-only and editable hardware manifest surfaces in `config-studio`

This track must not turn into a new runtime kind, a transport redesign, or a
generic target-configuration universe.

## Decision

Hardware catalog and hardware presets are treated as authoring-only bounded
configuration layers.

This means:

- hardware catalog lives in the authoring model only
- presets are convenience presets over authoring-time target choices, not new
  runtime kinds
- materializer may resolve hardware into target-neutral `hardware_resolution`
  metadata only
- target-facing `hardware` artifact sections are deterministic summaries over
  already resolved metadata
- the canonical preset lane remains limited to:
  - `lilygo_t3_v1_6_1_oled_lora_builtin_led`
  - `esp32_c3_super_mini_minimal`

## Consequences

- frozen hardware preset support stays additive-only beyond bugfixes
- no runtime Wi-Fi/display/source-of-truth target editor is implied
- no target transport, live probing, or board-management workflow is implied
- `config-studio` hardware surfaces stay bounded, authoring-only, and
  conflict-first
