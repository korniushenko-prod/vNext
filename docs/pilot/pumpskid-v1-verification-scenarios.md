# PumpSkid v1 Verification Scenarios

## Deploy / Apply / Readback

### V-01 Fresh Deploy
- materialize canonical `pump-skid-supervisor.project.e2e.json`
- validate compatibility
- emit deterministic ShipController artifact
- apply to the bounded ESP32 pilot adapter
- collect full readback

Expected:
- apply succeeds
- checksum is stable
- commissioning readback is online

### V-02 No-Op Re-Apply
- apply the same effective runtime pack again
- collect full readback again

Expected:
- checksum does not change
- no phantom drift appears in normalized readback

### V-03 Explicit Parameter Update
- change `run_hours_1.persist_period_s` from `60` to `45`
- re-materialize and re-apply

Expected diff:
- `$.artifacts.run_hours_counters[0].persist_period_s`

### V-04 Template-Derived Effective Update
- remove explicit `maintenance_counter_1.warning_before` override
- change `maintenance_pilot_template.defaults.param_values.warning_before` to
  `120`
- re-materialize and re-apply

Expected diff:
- `$.artifacts.maintenance_counters[0].warning_before`

### V-05 Readback Normalization
- compare fresh readback and no-op re-apply readback with normalized request id

Expected:
- no unexplained drift
- active mode/phase and package states remain stable

### V-06 Reboot-Style Restore
- create a fresh adapter instance
- apply the same effective runtime pack again
- collect readback

Expected:
- normalized readback matches the pre-restore readback
- config checksum stays stable

## Commissioning / Service

### V-07 Walkthrough
1. Open package overview
2. Inspect package summary
3. Inspect configuration/apply section
4. Inspect live signals
5. Inspect operations
6. Inspect ownership / permissive / protection sections
7. Inspect diagnostics

Expected:
- no hidden steps
- no raw JSON required to understand state

### V-08 Degraded States
- simulate `no_snapshot`
- simulate stale readback
- simulate failed operation result
- simulate unsupported permissive lane

Expected:
- degraded meaning remains readable from the commissioning surface

## Manual Bench Follow-Up

### V-14 Live Bench Pass
- capture screenshots
- capture operator notes
- capture reboot notes
- store final evidence next to the acceptance report

Expected:
- bounded pilot semantics remain understandable on the real bench
