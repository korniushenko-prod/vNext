# PumpSkid v1 Bench I/O Map

## Bench Channels

- `DO-17` -> `pump_cmd_1.cmd`
- `DI-34` -> `run_feedback_1.value`
- `DI-35` -> `fault_feedback_1.value`
- `AI-0` -> `pressure_pv_1.value`

## Package Member Mapping

- `pump_skid_supervisor_1__pump_cmd_1`
- `pump_skid_supervisor_1__run_feedback_1`
- `pump_skid_supervisor_1__fault_feedback_1`
- `pump_skid_supervisor_1__pressure_pv_1`

## Operational Intent

- `pump_cmd_1` represents the bounded starter command output
- `run_feedback_1` drives running summary and runtime accumulation
- `fault_feedback_1` drives fault summary and protection lanes
- `pressure_pv_1` drives pressure monitoring and commissioning visibility

## Notes

- the bench map is intentionally minimal and sufficient for a first pilot node
- helper package members used for ownership, override, and protection metadata
  do not require dedicated hardware bindings on this baseline
