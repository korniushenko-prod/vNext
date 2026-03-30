# PumpSkid v1 Verification Matrix

## Scope

This matrix verifies the already-frozen `PumpSkidSupervisor v1` pilot MVP on the
bounded `esp32.shipcontroller.v1` target path and current `config-studio`
commissioning surface.

## Matrix

| ID | Area | Scenario | Evidence Source | Status |
| --- | --- | --- | --- | --- |
| V-01 | Deploy | Fresh materialize -> compatibility -> artifact -> apply succeeds | `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js` | automated-pass |
| V-02 | Deploy | Re-apply without changes stays deterministic | `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js` | automated-pass |
| V-03 | Diff | Explicit parameter update produces bounded diff | `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js` | automated-pass |
| V-04 | Diff | Template-derived effective value update produces bounded diff | `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js` | automated-pass |
| V-05 | Readback | Readback normalization avoids phantom drift across no-op apply | `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js` | automated-pass |
| V-06 | Persistence | Reboot-style restore keeps normalized readback stable after restoring the same effective pack | `apps/config-studio/tests/packages/package-pilot-verification-harness.test.js` | automated-pass |
| V-07 | I/O path | Bound digital out / digital in / analog in paths remain visible on commissioning surface | `apps/config-studio/tests/packages/package-commissioning-e2e.test.js` | automated-pass |
| V-08 | Package semantics | Modes, supervision, permissive/interlock, protection, arbitration, override summaries stay visible | `apps/config-studio/tests/packages/package-commissioning-e2e.test.js` | automated-pass |
| V-09 | Commissioning | Documented walkthrough is executable without hidden steps | `apps/config-studio/tests/packages/package-commissioning-walkthrough.test.js` | automated-pass |
| V-10 | Degraded UX | `no_snapshot`, failed operation, unsupported lane, stale diagnostics remain understandable | `apps/config-studio/tests/packages/package-commissioning-walkthrough.test.js` | automated-pass |
| V-11 | Negative | Missing hardware binding stays explicit | `apps/config-studio/tests/packages/package-commissioning-e2e.test.js` | automated-pass |
| V-12 | Negative | Unsupported target profile stays explicit | `apps/config-studio/tests/packages/package-commissioning-e2e.test.js` | automated-pass |
| V-13 | Negative | Apply failure stays explicit | `targets/esp32-target-adapter/tests/pilot-deploy-readback.test.ts` | automated-pass |
| V-14 | Bench evidence | Physical bench screenshots / operator notes / live reboot notes | external bench run | pending-manual |

## Notes

- `V-06` is a bounded synthetic reboot-style restore, not a hardware power-cycle
  proof.
- `V-14` remains intentionally outside the repo and must be attached when a live
  bench session is performed.
