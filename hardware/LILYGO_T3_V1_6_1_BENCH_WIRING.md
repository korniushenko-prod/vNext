# LILYGO T3 V1.6.1 Bench Wiring

## Scope

This document is for the Stage 30 RC low-voltage bench validation path.

Use:

- USB power only
- low-voltage fixtures only

Do not use:

- mains wiring
- fuel or ignition hardware
- high-power loads

## Reserved onboard resources

Do not bench-wire over onboard reserved pins used by:

- OLED
- SD
- LoRa
- battery ADC
- status LED

See `hardware/LILYGO_T3_V1_6_1.md` for the reserved list.

## Safe external fixture types

- DI: push button or toggle switch
- AI: verified potentiometer or divider within safe limits
- PWM: LED plus resistor or logic-level observing input
- pulse: low-voltage pulse source only

## Binding policy

The project intentionally does not hardcode a final external bench pin map in the repo.

For local hardware validation:

- choose a non-reserved, non-strap GPIO
- bind it explicitly with build flags such as `BRINGUP_TEST_PULSE_PIN` or `BRINGUP_TEST_PWM_PIN`
- keep that choice local to the bench setup unless the project later adopts an audited shared fixture map

## Flow pulse-fixture path

Safe default:

- if `BRINGUP_TEST_PULSE_PIN` stays unbound, the controller still boots safely
- `/flow` remains in no-flowmeter mode
- this is the correct beta-safe behavior

Live path:

- bind `BRINGUP_TEST_PULSE_PIN` to a safe low-voltage pulse source
- rebuild/flash the bench image
- confirm serial/OLED/browser now show the flow bench path as available
- validate `/flow` and batch commands with low-voltage pulses only

## PWM fixture path

For PWM bench validation:

- bind `BRINGUP_TEST_PWM_PIN` explicitly
- use LED plus resistor or logic-level observing input only
- confirm boot leaves PWM in safe default OFF state
- observe changes only through low-voltage indication hardware

## Browser access

Once Wi-Fi is up, use the IP shown on the OLED:

- `http://<ip>/`
- `http://<ip>/flow`
- `http://<ip>/rules`

## Safe default expectation

- with all optional test pins unbound, the board must still boot safely
- no external outputs should assert automatically
- reserved pins must still be rejected
- flow live validation appears only after an explicit pulse-fixture bind
