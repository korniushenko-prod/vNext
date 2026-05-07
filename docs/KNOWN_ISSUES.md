# Known Issues

This list is for the Stage 30 release candidate.

## Blockers

No open RC blockers are intentionally accepted at this time.

## Warnings

### Flash-size mismatch visibility

- Severity: `warning`
- Current status: The project still uses the generic `esp32dev` PlatformIO board profile while the documented LILYGO expectation is `4MB` flash. A mismatch such as `Expected 4MB, found 2MB` must be treated as a visible bring-up warning.
- Workaround: Keep the warning visible, validate the real module before field use, and do not treat a mismatch as a clean hardware pass.

### No dedicated on-device PID browser page

- Severity: `warning`
- Current status: PID runtime and tests exist, but there is still no dedicated on-device PID browser page in the RC surface.
- Workaround: Use the existing runtime/service tests, simulator coverage, OLED summaries and any transport-neutral APIs instead of expecting a browser PID page.

### Local developer toolchain variance

- Severity: `warning`
- Current status: Host-side tests assume a reasonably recent desktop compiler and PlatformIO/ESP-IDF tooling. Local developer machines may still hit setup variance outside CI.
- Workaround: Prefer the CI matrix as the release baseline, keep local compilers up to date, and use the documented PlatformIO envs instead of ad-hoc board settings.

## Accepted Limitations

### MQTT remains transport-neutral and mock-backed

- Severity: `limitation`
- Current status: The MQTT layer is implemented as `MqttService` plus a backend abstraction and mock-backed host tests. The RC does not add a real broker client/backend in firmware CI.
- Workaround: Limit hardware smoke checks to an already-available external broker path and treat MQTT as optional for RC acceptance.

### Burner and incinerator templates are supervisory-only

- Severity: `limitation`
- Current status: Burner and incinerator template outputs remain supervisory-only skeleton bundles. They are not certified burner-management logic and not field-ready combustion control.
- Workaround: Use them only as reviewed supervisory scaffolds and keep independent external safety hardware in the real system.

### LoRa, SD and broad board peripherals are unsupported runtime areas

- Severity: `limitation`
- Current status: LoRa and SD remain reserved board resources and are not part of the supported runtime surface.
- Workaround: Keep those pins reserved and do not plan RC validation around LoRa, SD or reclaimed onboard resources.

### Bench path is low-voltage only

- Severity: `limitation`
- Current status: The supported hardware validation path is USB-powered, low-voltage bench work only.
- Workaround: Use LED/resistor, logic-level, DI, AI and pulse fixtures only. Do not connect mains, fuel, ignition or high-power field loads.

### No mains, fuel or high-power field use

- Severity: `limitation`
- Current status: This RC is not approved for mains switching, burner fuel trains, ignition hardware or high-power field commissioning.
- Workaround: Keep validation on the low-voltage bench and rely on external certified safety devices in real equipment.

### Flow live validation depends on an explicit pulse fixture bind

- Severity: `limitation`
- Current status: The flow page intentionally stays in a safe-default empty state until `BRINGUP_TEST_PULSE_PIN` is bound to a safe pulse source.
- Workaround: Bind a safe non-reserved pulse pin locally for live flow and batch checks; otherwise accept the empty state as correct RC behavior.
