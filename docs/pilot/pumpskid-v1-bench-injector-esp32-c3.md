# PumpSkid v1 Bench Injector — ESP32-C3

## Purpose

This helper is the bounded `ESP32-C3` satellite used during `PR-35A` to
generate controlled bench inputs for the frozen `PumpSkidSupervisor v1` pilot
bundle.

It is not a second controller runtime and it does not introduce a new target
family. It only provides operator-driven bench stimuli through a small local
Web UI.

## Bench Role

- primary DUT: `LilyGO LoRa32 T3_V1.6.1 + OLED`
- bench injector: `ESP32-C3`
- real output proof: relay loads on the LilyGO outputs

The injector covers the bounded feedback and degraded lanes required by the
pilot bench:

- `run_feedback_1`
- `fault_feedback_1`
- `pressure_pv_1`

Optional helper lane:

- pulse output for future signal-path checks

## Firmware Target

- target folder: `targets/bench-signal-injector-esp32-c3`
- AP SSID: `BenchInjector-C3`
- AP password: `bench1234`

## Pin Intent On The Injector

- `GPIO3` -> optional command sense from the LilyGO command line
- `GPIO4` -> run feedback output
- `GPIO5` -> fault feedback output
- `GPIO6` -> optional pulse output
- `GPIO7` -> pressure PWM output
- `GPIO8` -> built-in LED activity mirror

## Wiring Guardrails

- keep a shared `GND` between LilyGO and ESP32-C3
- keep all logic lanes at `3.3V`
- do not use `GPIO20` or `GPIO21` on the C3 injector
- use the existing frozen pilot bench map as the source of truth for the DUT
  side bindings

## Pressure Lane

`GPIO7` provides PWM, not a process-accurate analog model. For a slow and
bench-safe pressure visibility lane, route it through a simple RC filter before
it reaches the LilyGO analog input.

Suggested first-pass filter:

- resistor: `1kΩ`
- capacitor: `10uF`

This is sufficient for commissioning and degraded bench checks. It is not
intended to represent real hydraulic behavior.

## Session Use

During the live bench session the injector page should be used to:

- force idle / running / low-pressure / faulted presets
- toggle run and fault feedback manually
- adjust the bounded pressure lane
- capture screenshots that match the commissioning walkthrough and readback
  evidence

## Scope Note

Any required changes to the pilot package, target contracts, or controller
runtime still belong outside this helper. This file only fixes the bounded
bench-helper role of the `ESP32-C3`.

