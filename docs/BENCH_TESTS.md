# Bench Tests

## Scope

Stage 29/30 bench validation is:

- USB-powered only
- low-voltage only
- browser, OLED and serial oriented
- safe-default first
- focused on validation support and regression hardening
- aligned with the RC acceptance checklist

It is not:

- mains testing
- fuel or burner testing
- high-power load switching
- production commissioning

## Target build

Use:

```bash
pio run -e lilygo_t3_v161_bench_web
```

Optional live-flow bench path:

- rebuild locally with `BRINGUP_TEST_PULSE_PIN=<safe_gpio>`
- keep reserved pins and strap-sensitive pins rejected
- do not commit site-specific pin choices as project defaults

Optional PWM bench path:

- rebuild locally with `BRINGUP_TEST_PWM_PIN=<safe_gpio>`
- verify with LED plus resistor or a logic-level observing target only

## Bench validation matrix

| Area | Setup | Expected result |
| --- | --- | --- |
| Boot / OLED / serial | USB only, no external fixtures | Safe boot, heartbeat, OLED IP line, concise serial bring-up log |
| Browser reachability | Open `http://<ip>/` | Dashboard loads without exposing secrets |
| Dashboard commands | Use start/stop/trip/reset | Requests return stable browser responses and runtime remains safe |
| Rules browser path | Open `/rules` | Read-only list/detail works and runtime does not mutate unexpectedly |
| Flow safe default | Leave `BRINGUP_TEST_PULSE_PIN` unbound | Flow page stays in explicit no-flowmeter safe-default mode |
| Flow live pulse path | Bind `BRINGUP_TEST_PULSE_PIN` to a low-voltage pulse source | `flow.bench` registers, flow page shows live runtime, pulses increase totals |
| Batch commands | With live pulse fixture bound | Start/stop/reset commands are browser-testable and batch can complete |
| DI fixture | Bind `BRINGUP_TEST_DI_PIN` to a safe switch fixture | Bench DI signal toggles cleanly and does not break runtime |
| AI fixture | Bind `BRINGUP_TEST_AI_PIN` to a safe divider/pot | Browser/runtime values stay sane and within expected low-voltage range |
| PWM fixture | Bind `BRINGUP_TEST_PWM_PIN` to LED+resistor or logic-level target | PWM safe default is OFF at boot and changes are observable only through low-voltage fixture hardware |
| Reboot with no fixtures | Power cycle with all optional pins unbound | Device returns to safe default and browser path remains reachable |
| Reboot with pulse fixture bound | Power cycle with live pulse input still wired | Flow bench re-registers cleanly and does not auto-start unsafe outputs |
| Reboot after batch start/stop | Start batch, stop/reset, then reboot | Runtime returns to safe default unless explicitly designed otherwise |
| Flash mismatch visibility | Build/profile mismatch case | OLED/serial/browser-visible warning remains explicit |
| Safe-default no-autostart | Fresh boot | No automatic rule/program/PID/output start occurs |

## Browser checks

1. Power the board from USB only.
2. Read the OLED IP line.
3. Open:
   - `http://<ip>/`
   - `http://<ip>/flow`
   - `http://<ip>/rules`
4. Verify:
   - dashboard loads
   - flow page either shows the safe-default empty state or a live `flow.bench` runtime
   - rules page remains read-only

## Flow pulse-fixture path

Expected safe-default behavior with the pulse fixture unbound:

- no automatic flow registration
- flow page stays empty
- browser messaging explains that this is the safe default

Expected live behavior with the pulse fixture bound:

- `flow.bench` is registered
- browser status changes from waiting/idle to live when pulses arrive
- batch start/stop/reset becomes hardware-testable from `/flow`

## Reboot checks

Run at least these smoke cases:

1. Reboot with no external fixtures.
2. Reboot with pulse fixture bound but idle.
3. Reboot after batch start and stop.
4. Reboot after a visible warning such as flash mismatch or missing fixture.

Expected result:

- the controller returns to safe defaults unless a retained behavior is explicitly documented
- unowned outputs remain safe
- flow live path only reappears when the pulse fixture is still explicitly bound

## Optional MQTT smoke path

If an existing broker is already available outside CI:

- use the existing MQTT bridge only
- verify connection, availability topic and a small status publish set
- do not expand broker setup or require MQTT in CI

See also `docs/RC_CHECKLIST.md` and `docs/KNOWN_ISSUES.md`.
