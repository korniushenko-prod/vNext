# RC Checklist

Use this as the final Stage 30 acceptance checklist for the release candidate.

## Target Build

- [ ] `lilygo_t3_v161_bringup` compiles successfully.
  Pass criteria: PlatformIO completes without source or link errors.
- [ ] `lilygo_t3_v161_bench_web` compiles successfully.
  Pass criteria: PlatformIO completes with the bench/web partition file and expected build flags.
- [ ] CI host-side and target jobs are green.
  Pass criteria: structure validation, host-side suites, simulator suites and both target compile steps pass.

## Safe Boot

- [ ] Safe boot works with all optional bench pins unbound.
  Pass criteria: no relay/PWM assertion at boot, no automatic program/rule/PID start, no crash loop.
- [ ] Flash mismatch warnings remain explicit.
  Pass criteria: board/image/detected flash mismatch is surfaced in serial and local status instead of being ignored.
- [ ] Reserved pin enforcement still blocks unsafe bench mappings.
  Pass criteria: reserved OLED/SD/LoRa/battery/LED pins are not silently accepted as test pins.

## Local HMI And Browser

- [ ] OLED/IP status is visible on boot.
  Pass criteria: OLED reaches the compact status screen and shows IP with `STA IP > AP IP > ---`.
- [ ] Dashboard is reachable on device.
  Pass criteria: `GET /` loads and `GET /api/dashboard/data` returns coherent status.
- [ ] Flow page is reachable on device.
  Pass criteria: `GET /flow` loads and flow API routes respond.
- [ ] Rules page is reachable on device.
  Pass criteria: `GET /rules` loads and rules list/detail routes respond.
- [ ] Rules hardware binding stays read-only.
  Pass criteria: no on-device rule mutation routes are exposed.

## Bench Path

- [ ] Bench mode behavior is explicit when enabled.
  Pass criteria: OLED/serial show bench signage and the device still stays low-voltage-only.
- [ ] Pulse fixture safe-default path works.
  Pass criteria: with `BRINGUP_TEST_PULSE_PIN` unbound, `/flow` remains in the explicit no-flowmeter safe-default state.
- [ ] Pulse fixture live path works when bound locally.
  Pass criteria: `flow.bench` registers and pulses advance totals/rate on `/flow`.
- [ ] Batch commands work on the live flow path.
  Pass criteria: start, stop and reset succeed through `/api/flow/{id}/batch/*`.
- [ ] Safe default with unbound resources is preserved.
  Pass criteria: optional DI/AI/PWM/pulse fixtures may remain unbound without unsafe behavior.

## Runtime Surface

- [ ] Sequence runtime remains startable from the dashboard path.
  Pass criteria: dashboard start/stop/trip/reset flow still works.
- [ ] Logic/runtime read-only inspection is coherent.
  Pass criteria: rules list/detail/trace data remains readable and stable.
- [ ] MQTT RC status is documented correctly.
  Pass criteria: docs and status messaging describe the bridge as transport-neutral/mock-backed unless a local broker is added outside CI.

## Documentation

- [ ] Feature freeze is documented.
  Pass criteria: README and `docs/DECISIONS.md` both state the RC freeze and supported surface.
- [ ] Known issues are explicit.
  Pass criteria: `docs/KNOWN_ISSUES.md` covers flash size, PID page status, MQTT limits, bench limits and unsupported field areas.
- [ ] Test/build matrix is documented.
  Pass criteria: `docs/TEST_MATRIX.md` matches CI and manual validation scope.
- [ ] Release notes exist.
  Pass criteria: `docs/RELEASE_NOTES_RC.md` summarizes support, exclusions and next steps.
