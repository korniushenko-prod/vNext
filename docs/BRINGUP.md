# Bring-up

## Stage 27 scope

Stage 27 adds the first real ESP32 target build and board bring-up layer for:

- board: `LILYGO T3 V1.6.1 / LoRa32 V2.1.6`
- PlatformIO env: `lilygo_t3_v161_bringup`
- platform: `espressif32`
- framework: `espidf`

This stage is intentionally narrow:

- target firmware now compiles with PlatformIO/ESP-IDF
- the built-in OLED is initialized through a real SSD1306-oriented `DisplayHal`
- the onboard LED blinks as a heartbeat
- a minimal bring-up Wi-Fi path exposes STA/AP IP state only
- startup state is safe even with no external wiring
- optional external bring-up pins exist but stay unbound by default

## PlatformIO

Use:

```bash
pio run -e lilygo_t3_v161_bringup
```

Stage 28 bench/web build:

```bash
pio run -e lilygo_t3_v161_bench_web
```

The target firmware entrypoint lives in `src/main.cpp`.

Stage 27b adds build-time bring-up defaults in `platformio.ini` for:

- default STA preset SSID `Infinity-Starlink`
- configurable STA/AP names through build flags
- OLED IP-only default rendering
- board flash expectation `4MB` for the flash sanity gate

## Board profile

The runtime board profile is implemented in:

- `firmware/components/hal/include/hal/board_profile.hpp`
- `firmware/components/hal/include/hal/board_profile_lilygo_t3_v1_6_1.hpp`

The profile encodes:

- board name and SoC
- onboard OLED presence and I2C pins
- current bring-up OLED reset policy
- reserved board pins
- onboard status LED
- optional external test pins for relay, DI, PWM, pulse and analog input

## Reserved pins

Reserved by default in Stage 27:

- OLED: GPIO21, GPIO22
- SD: GPIO13, GPIO15, GPIO2, GPIO14
- LoRa: GPIO5, GPIO19, GPIO27, GPIO23, GPIO33, GPIO32, GPIO18
- other onboard: GPIO35 battery ADC, GPIO25 status LED

These pins are enforced by the board profile for default bring-up.

Current OLED bring-up policy:

- SDA: `GPIO21`
- SCL: `GPIO22`
- reset line is not actively driven in Stage 27b (`reset = unbound`)
- `GPIO16` stays reserved conservatively until pin audit confirms whether it is safe to reuse

## Optional external test pins

Stage 27 supports placeholders for:

- `test_relay_pin`
- `test_di_pin`
- `test_pwm_pin`
- `test_pulse_pin`
- `test_ai_pin`

All of them are unbound by default. The firmware must boot, render OLED status and heartbeat safely with no external test wiring attached.

## Safe boot behavior

Safe boot policy in this stage:

- unbound external outputs stay inactive
- no relay or PWM output is asserted by default
- no sequence, rule, PID, motor or stepper runtime is auto-started
- initialization failures move the firmware into a safe status loop instead of a crash loop
- OLED and serial log show bring-up state or safe-mode reason when available

Stage 27b keeps the same safe boot policy while adding two explicit bring-up gates:

- OLED network display policy: show only `IP: ...` by default with priority `STA IP > AP IP > ---`
- flash sanity policy: never ignore a board/image/detected flash mismatch before real hardware validation

## Expected boot behavior

Normal bring-up:

- serial startup log prints firmware start, board profile and test-pin summary
- serial log prints concise Wi-Fi bring-up transitions without showing passwords
- OLED shows a short splash and then a compact bring-up status screen
- OLED network line shows only one IP using priority `STA IP > AP IP > ---`
- onboard LED on GPIO25 blinks as a heartbeat

Safe-mode bring-up:

- serial log reports the first blocking reason
- OLED keeps the same IP-only status view and shows a concise flash/safe warning when present
- LED heartbeat continues

## Stage 27b Wi-Fi / OLED policy

- Default STA preset SSID: `Infinity-Starlink`
- STA password source is a build-time placeholder flag and is never shown on OLED or serial
- AP name is configurable in the same local bring-up config/build flags
- OLED default is one IP line only
- STA SSID and AP name stay hidden on OLED by default
- Display priority is `STA IP > AP IP > ---`

Examples:

- `IP: 192.168.x.x` when STA is connected
- `IP: 192.168.4.1` when only AP is active
- `IP: ---` when neither interface has an IP

## Flash sanity gate

- The documented board expectation for this bring-up path is `4MB` flash.
- The current generic `esp32dev` build path can still produce a flash-size mismatch warning such as `Expected 4MB, found 2MB`.
- Stage 27b treats that mismatch as a visible bring-up warning/blocker, not as noise to ignore.
- Serial log reports board expectation, image-configured flash size and runtime-detected flash size when available.
- OLED shows a concise flash warning when a mismatch is present.
- Bring-up continues in safe status mode with no external outputs enabled, but first real hardware validation is not considered clean until the flash-size situation is understood.

## HAL scope in this stage

Real ESP32 backends now exist for:

- relay
- digital input
- analog input
- PWM
- pulse input
- display

Stepper hardware bring-up is still postponed.

## Stage 28 bench/web scope

Stage 28 keeps the Stage 27 safe boot path and adds only:

- a minimal embedded HTTP server binding on ESP32
- static asset serving for `/`, `/flow` and `/rules`
- safe API route binding for dashboard commands, flow batch commands and read-only rules data
- optional bench mode signage on OLED and serial
- low-voltage-only bench validation guidance

Stage 28 does not add:

- mains-voltage or fuel-load procedures
- HTTP auth, HTTPS/TLS or MQTT UI
- on-device rule/program/template editing
- LoRa or SD runtime support
- automatic runtime program/rule/PID/motor/stepper start

## Stage 28 on-device web behavior

- OLED still shows one IP line only with `STA IP > AP IP > ---`
- Open `http://<ip>/` for the dashboard
- Open `http://<ip>/flow` for the flow page
- Open `http://<ip>/rules` for the read-only rules page
- If HTTP fails to start, the device stays in safe status mode with OLED and serial diagnostics

## Stage 28 bench mode

- Bench mode is optional and build-time controlled
- Default `lilygo_t3_v161_bench_web` build keeps bench mode disabled
- When enabled, OLED and serial show `BENCH MODE`
- External test pins remain unbound by default and reserved pins remain rejected
- Bench checks are low-voltage only for DI, AI, PWM and pulse fixtures

## Stage 29 beta-hardening additions

Stage 29 keeps the same bring-up architecture and adds only hardening/validation support:

- clearer flow empty-state diagnostics when the pulse fixture is unbound
- clearer flow runtime diagnostics when a pulse fixture is bound but idle
- explicit serial/OLED/browser hints for the live flow bench path
- validation matrix and low-voltage bench guidance updates

Stage 29 does not add:

- a new pin map baked into the repo
- mains or field-power procedures
- new production auth/TLS/OTA work
- LoRa or SD runtime features

## Stage 29 pulse-fixture bind path

For local live-flow validation:

1. choose a safe non-reserved, non-strap GPIO
2. bind it locally with `BRINGUP_TEST_PULSE_PIN=<gpio>`
3. rebuild the `lilygo_t3_v161_bench_web` image
4. flash and reboot
5. verify that `/flow` now shows `flow.bench`

Expected behavior when unbound:

- no automatic flow registration
- `/flow` stays in explicit safe-default empty mode

Expected behavior when bound:

- `flow.bench` registers on boot
- browser status can move from waiting/idle to live as pulses arrive
- batch commands become hardware-testable with a low-voltage pulse source

## Stage 30 RC stabilization note

Stage 30 does not add a new bring-up architecture.
It keeps the same target/runtime path and freezes the supported validation baseline at:

- `lilygo_t3_v161_bringup` for Stage 27 regression compile coverage
- `lilygo_t3_v161_bench_web` for Stage 29/30 browser and bench validation
- OLED IP-first local diagnostics
- dashboard, flow and read-only rules on-device routes
- low-voltage-only manual bench checks

Release-candidate acceptance is tracked in `docs/RC_CHECKLIST.md`.
