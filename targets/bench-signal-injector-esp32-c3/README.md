# ESP32-C3 Bench Signal Injector

This target is a small bench-only helper for `PR-35A`. It turns an `ESP32-C3`
board into a web-controlled signal injector for the frozen LilyGO pilot bundle.

It is intentionally not a second controller runtime. It only generates bounded
stimuli for the real bench:

- `run_feedback`
- `fault_feedback`
- `pulse output`
- `pressure PWM` for slow analog simulation

## Why This Exists

For the current physical bench we have:

- `LilyGO LoRa32 T3_V1.6.1 + OLED` as the DUT
- `ESP32-C3` as the input injector
- relay outputs on the LilyGO for real output proof

This firmware gives us a small AP/Web UI so we can drive the pilot bench
without opening a new runtime wave or inventing a fake simulator.

## PlatformIO

```powershell
cd targets\bench-signal-injector-esp32-c3
& "C:\Users\Administrator\.platformio\penv\Scripts\pio.exe" run
```

Use the board environment:

- `esp32c3_bench_injector`

## Wi-Fi

The firmware starts its own access point:

- SSID: `BenchInjector-C3`
- Password: `bench1234`

Default AP address is normally `192.168.4.1`.

## Pin Map

- `GPIO3` -> optional LilyGO command sense input
- `GPIO4` -> run feedback output
- `GPIO5` -> fault feedback output
- `GPIO6` -> pulse output
- `GPIO7` -> pressure PWM output
- `GPIO8` -> built-in LED activity mirror

Do not use:

- `GPIO20`
- `GPIO21`

Those stay reserved for USB programming/monitor.

## Wiring Notes

- share `GND` between the LilyGO DUT and the ESP32-C3 injector
- keep all logic at `3.3V`
- use `GPIO4` and `GPIO5` for the two bounded digital feedback lanes
- use `GPIO7` through a simple RC filter if you want a smooth analog pressure
  value on the LilyGO analog input

A first-pass bench filter is enough:

- resistor: `1kΩ`
- capacitor: `10uF`

That is intentionally a slow bench-friendly pressure lane for commissioning and
degraded-state checks, not a process-accurate analog model.

## Suggested PR-35A Mapping

- `GPIO4` -> `run_feedback_1`
- `GPIO5` -> `fault_feedback_1`
- `GPIO7` through RC filter -> `pressure_pv_1`

Optional:

- `GPIO3` <- LilyGO `pump_cmd_1` if you want the injector page to show the DUT
  command line during the session

## Scope Guard

This target does not:

- implement a new controller runtime
- add new target families
- add new package/library semantics
- simulate plant physics

It is a bounded bench helper for physical evidence capture.
