# Test Matrix

This document describes the Stage 30 RC validation surface.

## Host-Side Suites

CI keeps the host-side suites grouped by runtime area:

- Structure/docs validation: repository structure plus required RC docs.
- Core configuration and persistence: `tests/config`, `tests/storage`.
- HAL and signal foundations: `tests/hal`, `tests/signals`, `tests/timers`, `tests/alarms`, `tests/conditions`.
- Runtime services: `tests/actuators`, `tests/logic`, `tests/sequence`, `tests/flow`, `tests/pid`.
- API and web adapters: `tests/api`, `tests/webui`, `tests/templates`, `tests/mqtt`, `tests/display`.
- Simulator/integration: `tests/sim`.

These remain deterministic host-side tests with mock HAL, explicit time and no live hardware dependency.

## Target Compile Suites

CI keeps both target compile envs:

- `lilygo_t3_v161_bringup`
  Purpose: Stage 27 bring-up regression compile surface.
  Scope: ESP32 target build, OLED/IP bring-up path, safe boot baseline.

- `lilygo_t3_v161_bench_web`
  Purpose: Stage 29/30 browser-and-bench compile surface.
  Scope: embedded dashboard/flow/rules assets, HTTP binding, low-voltage bench runtime path, dedicated partition file.

## Hardware-Only / Manual Validation

These areas remain manual and are not CI-automated:

- Safe boot on the real LILYGO T3 V1.6.1 target.
- OLED visibility and IP display.
- Browser reachability for `/`, `/flow` and `/rules`.
- Dashboard command smoke path on hardware.
- Flow safe-default behavior when the pulse fixture is unbound.
- Flow live pulse and batch path when a safe local pulse fixture is explicitly bound.
- Reserved-pin enforcement during bench wiring.
- Low-voltage DI/AI/PWM fixture checks.
- Optional MQTT smoke checks only when an external broker already exists.

## RC Interpretation

- CI is the release baseline for host logic, adapters, simulator coverage and target compilation.
- Manual bench validation is limited to the low-voltage LILYGO path documented in `docs/BENCH_TESTS.md` and `hardware/LILYGO_T3_V1_6_1_BENCH_WIRING.md`.
- No RC acceptance item requires mains, fuel, ignition, LoRa or SD validation.
