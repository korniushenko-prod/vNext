# Controlled Pilot Environment Manifest

## Target Baseline

- target family: `esp32.shipcontroller.v1`
- adapter: `@universal-plc/esp32-target-adapter`
- package: `std.pump_skid_supervisor.v1`
- package instance: `pump_skid_supervisor_1`
- canonical pack id used in executable harness: `pump-skid-supervisor-demo-pack`
- canonical generated-at used in executable harness: `2026-03-30T00:00:00Z`

## Bench I/O Mapping

- `DO-17` -> `pump_skid_supervisor_1__pump_cmd_1.cmd`
- `DI-34` -> `pump_skid_supervisor_1__run_feedback_1.value`
- `DI-35` -> `pump_skid_supervisor_1__fault_feedback_1.value`
- `AI-0` -> `pump_skid_supervisor_1__pressure_pv_1.value`

## Source References

- bench map:
  `docs/pilot/pumpskid-v1-bench-io-map.md`
- target profile:
  `docs/pilot/pumpskid-v1-target-profile.md`
- bench injector helper:
  `docs/pilot/pumpskid-v1-bench-injector-esp32-c3.md`
- canonical bundle:
  `docs/pilot/pumpskid-v1-controlled-pilot.project.json`
- canonical artifact:
  `docs/pilot/pumpskid-v1-controlled-pilot.artifact.json`
- canonical readback:
  `docs/pilot/pumpskid-v1-controlled-pilot.readback.json`

## Minimum Environment Expectations

- one ESP32 ShipController bench target matching the frozen pilot profile
- stable persistence support enabled
- ability to capture deploy/readback outputs and reboot timestamps
- commissioning access via the bounded `config-studio` surface

## Exclusions

- no new target family
- no OTA/update manager work
- no cloud/fleet rollout tooling
- no safety-certified evidence workflow
