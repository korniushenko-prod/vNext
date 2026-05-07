# Beta

Stage 29 beta is the baseline that Stage 30 RC stabilizes.

Current release-candidate guidance lives in:
- `docs/RC_CHECKLIST.md`
- `docs/KNOWN_ISSUES.md`
- `docs/RELEASE_NOTES_RC.md`
- `docs/TEST_MATRIX.md`

## Stage 29 status

Stage 29 is the completed beta-hardening stage for the LILYGO T3 V1.6.1 low-voltage bench target.

Confirmed baseline:

- safe boot on real hardware
- OLED IP visibility
- embedded web reachable from a browser
- dashboard, flow and rules routes reachable on-device
- dashboard command path working on hardware
- flow safe default preserved when the pulse fixture is unbound

Stage 29 adds:

- clearer flow empty-state and live-state diagnostics
- explicit pulse-fixture bind path for live flow validation
- bench validation matrix and beta guidance
- stricter low-voltage-only documentation for pulse/PWM/DI/AI fixtures
- small runtime/browser/OLED/serial hardening only

## Beta-tested paths

Currently in scope for beta validation:

- boot, OLED, serial, Wi-Fi and browser access
- dashboard command smoke path
- read-only rules browser path
- flow safe-default path with no pulse fixture bound
- flow live path when `BRINGUP_TEST_PULSE_PIN` is bound to a safe low-voltage pulse source
- batch start, stop and reset against that pulse fixture
- DI, AI and PWM fixture smoke checks
- reboot-to-safe-default regression checks
- flash mismatch visibility
- optional MQTT smoke path when a broker path already exists outside CI

## Known limits

This beta does not add:

- mains or high-power validation
- fuel, ignition or burner field procedures
- production auth, TLS or OTA
- LoRa or SD runtime work
- large new runtime/editor architecture

Current known limitations:

- flow live validation requires an explicitly bound low-voltage pulse test pin
- PID service exists in the codebase, but Stage 29 does not add a new dedicated on-device PID browser surface
- template/rule/program editing on hardware remains out of scope for this stage

## Safety boundary

Beta here means safe low-voltage bench use only.

It does not mean:

- certified safety PLC behavior
- burner management certification
- field-ready mains switching
- approved fuel-train operation

Use external independent safety devices where the application requires them.
