# PumpSkid v1 Target Profile

## Target

- target family: `esp32.shipcontroller.v1`
- adapter: `esp32-target-adapter`
- deploy/apply/readback baseline: required for pilot acceptance

## Minimum Bench Profile

- `2` digital outputs minimum
- `2` digital inputs minimum
- `1` analog input minimum
- persistence support available
- service/config access available on the commissioning bench

## Bench Mapping Intent

- `pump_cmd_1` -> digital output
- `run_feedback_1` -> digital input
- `fault_feedback_1` -> digital input
- `pressure_pv_1` -> analog input

## Constraints

- no new target family is introduced in the pilot track
- no OTA/update manager work is introduced here
- no cloud deployment path is introduced here
- readback remains bounded to package and operation summary visibility

## Freeze Note

The pilot target profile is intentionally small and bench-oriented. If hardware
hardening is needed later, it should open as a separate post-MVP track instead
of expanding the pilot baseline in place.
