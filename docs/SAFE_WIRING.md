# Safe Wiring

## Stage 30 RC policy

Stage 30 RC wiring remains bench-only and low-voltage only.

Allowed:

- USB power
- low-voltage buttons and switches
- low-voltage pulse generators
- LED plus resistor indicators
- safe logic-level observing inputs
- verified low-voltage divider or potentiometer fixtures

Not allowed:

- mains voltage
- fuel valves
- ignition hardware
- real pump, compressor or heater power circuits
- unknown shared grounds
- improvised mixed-voltage wiring

## Reserved pins

Do not use reserved onboard LILYGO pins for bench fixtures.

See:

- `hardware/LILYGO_T3_V1_6_1.md`
- `hardware/LILYGO_T3_V1_6_1_BENCH_WIRING.md`

## Fixture rules

- All optional test pins stay unbound by default.
- Bind only one safe low-voltage purpose per external test pin.
- Do not bypass reserved-pin enforcement.
- Do not use boot strap pins.
- Keep pulse and DI fixtures electrically simple and easy to remove.

## Suggested fixtures

- DI: one push-button or toggle switch fixture
- AI: one verified potentiometer/divider inside the allowed low-voltage range
- PWM: one LED plus resistor or one logic-level observing input
- pulse: one clean low-voltage pulse source only

## Output policy

- relay-style bench outputs are indicator/test outputs only
- no field loads are permitted in this stage
- fuel and ignition roles remain out of scope
- if a fixture behaves unexpectedly, remove it and return to USB-only safe boot first

## Pulse fixture rule

For live flow validation:

- bind `BRINGUP_TEST_PULSE_PIN` explicitly
- keep the source low-voltage only
- expect no flow registration until that binding exists
- treat the unbound flow page state as the correct safe default

## PWM fixture rule

For PWM validation:

- bind `BRINGUP_TEST_PWM_PIN` explicitly
- use LED plus resistor or a logic-level observing target only
- do not connect mains, motors or inductive field loads

## Safe stop rule

If OLED, serial or browser status looks wrong:

1. remove the external low-voltage fixture
2. keep USB power only
3. confirm safe boot and reserved-pin policy first
