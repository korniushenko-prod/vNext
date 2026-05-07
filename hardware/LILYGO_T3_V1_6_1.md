# LILYGO T3 V1.6.1 / LoRa32 V2.1.6

## Board name

LILYGO T3 V1.6.1 / LoRa32 V2.1.6

## SoC family

ESP32

## Flash

4 MB

## Intended PlatformIO profile

```ini
platform = espressif32
board = esp32dev
```

## Bring-up flash note

The documented board expectation for this project is still `4 MB` flash.

The current narrow Stage 27 bring-up path keeps the generic `esp32dev` PlatformIO profile, so the firmware must explicitly surface any board/image/detected flash mismatch during hardware validation instead of treating it as a harmless warning.

## Primary use in this project

Primary bring-up, HMI and controller board for early physical validation.

## Built-in display

This board includes a built-in 0.96" SSD1306 OLED display with 128x64 resolution.

## Reserved pin table

### OLED

| GPIO | Role |
| --- | --- |
| GPIO21 | SDA |
| GPIO22 | SCL |

Current Stage 27b note:

- the OLED reset line is not actively driven by the bring-up firmware profile
- `GPIO16` remains reserved conservatively until the board pin audit confirms whether it is a real OLED reset dependency or just a historical placeholder

### SD

| GPIO | Role |
| --- | --- |
| GPIO13 | CS |
| GPIO15 | MOSI |
| GPIO2 | MISO |
| GPIO14 | SCK |

### LoRa

| GPIO | Role |
| --- | --- |
| GPIO5 | SCK |
| GPIO19 | MISO |
| GPIO27 | MOSI |
| GPIO23 | RESET |
| GPIO33 | DIO1 |
| GPIO32 | DIO2 |
| GPIO18 | CS |

### Other onboard

| GPIO | Role |
| --- | --- |
| GPIO35 | Battery ADC |
| GPIO25 | On-board LED |

## Pin-budget warning

This board is not treated as an empty generic dev board in this project. It already consumes a significant part of the ESP32 GPIO budget for onboard OLED, SD, LoRa, battery sensing and status LED functions.

Relays and field IO for MVP and later stages may require external expansion, a carrier board or both.

## Recommended policy

- Built-in OLED is reserved by default.
- LoRa is reserved by default.
- SD is reserved by default.
- Battery ADC is reserved by default.
- LED is reserved by default.

MVP firmware does not depend on LoRa or SD, but those onboard connections are still treated as reserved unless an explicit hardware decision documents how they are reclaimed.

## Project warning

- These pins are considered reserved by default in this project.
- Reclaiming them later requires explicit hardware decision and documentation.

## Planned external IO strategy

Because onboard peripherals consume many GPIOs, relay outputs, field inputs and other external interfaces may need IO expansion or carrier hardware instead of direct connection to the bring-up board alone.

## Pin audit required

Before Stage 27 hardware bring-up, the project must explicitly classify:

- reserved pins
- safe output-capable pins
- input-only pins
- boot-sensitive pins
- externally expanded IO if needed

Final pin assignment must be validated before real hardware bring-up.

## Stage 27 bring-up note

Stage 27 adds:

- a runtime board profile in `firmware/components/hal/include/hal/board_profile_lilygo_t3_v1_6_1.hpp`
- reserved-pin enforcement by default
- a real SSD1306-oriented OLED backend for local text status
- a bring-up Wi-Fi/IP status screen with default STA preset `Infinity-Starlink`
- OLED default IP-only rendering with priority `STA IP > AP IP > ---`
- a flash sanity gate that flags `4MB` expectation mismatches during bring-up
- optional external bring-up test pins that stay unbound by default

This board is still treated as a reserved-pin HMI/CPU board first, not as a fully assigned 4-relay carrier board.

## Stage 28 bench/web note

Stage 28 keeps the same board policy and adds:

- an optional `lilygo_t3_v161_bench_web` target for browser-based validation
- embedded HTTP access to `/`, `/flow` and `/rules`
- low-voltage-only bench guidance for DI, AI, PWM and pulse fixtures

Stage 28 does not change the reserved-pin budget:

- reserved onboard OLED, SD, LoRa, battery ADC and LED pins must not be silently repurposed
- optional external bench pins stay unbound by default
- any relay-style bench output must remain low-voltage test-only

## Stage 30 RC note

Stage 30 keeps this board and the same two PlatformIO envs as the release-candidate hardware baseline:

- `lilygo_t3_v161_bringup` for compile-only bring-up regression coverage
- `lilygo_t3_v161_bench_web` for browser and low-voltage bench validation

RC does not add LoRa, SD, mains, fuel or high-power field support on this board.
