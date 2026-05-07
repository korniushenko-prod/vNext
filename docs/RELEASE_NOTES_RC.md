# Release Notes RC

## Stage 30 RC1

This release candidate freezes the current supported surface for the ESP32 Relay / Flow / PID / Sequence Controller on the LILYGO T3 V1.6.1 baseline.

Supported in this RC:
- on-device dashboard, flow page and read-only rules page
- sequence, logic, flow, PID, motor and stepper runtimes
- template engine
- transport-neutral MQTT bridge with mock-backed tests
- OLED local status display
- low-voltage bench validation path

Intentionally not supported:
- new UI pages
- new protocols
- on-device rule/program/template editing
- real MQTT broker client/backend in firmware CI
- LoRa, SD, mains, fuel, ignition or high-power field use

What changed since the earlier architecture stages:
- the build/test surface is frozen and documented
- the bring-up and bench/web envs remain the RC baseline
- known limits, acceptance checks and release-readiness docs are now explicit
- stale doc wording about missing HTTP bindings and display backend status is cleaned up

What remains for future versions:
- dedicated PID browser UI if still needed
- broader on-device editing/admin surfaces
- real MQTT backend work
- post-RC hardware expansion and non-bench deployment work
