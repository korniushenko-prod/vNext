# Competitor Analysis: Universal Block Base v1

## Purpose

This document checks whether the current universal block base is broad enough when compared with:

- PLC / IEC 61131-3 function-block ecosystems
- Siemens-style industrial controller instruction sets
- ESPHome-style practical automation components

The goal is not to copy competitor UX.

The goal is to verify that our primitive layer is:

- universal enough
- small enough
- still broad enough for variable marine and machinery tasks

## Primary Source Set

Official or primary references used in this pass:

- CODESYS Standard library:
  - `https://content.helpme-codesys.com/en/libs/Standard/Current/index.html`
  - `https://content.helpme-codesys.com/en/libs/Standard/Current/Timer/TOF.html`
  - `https://content.helpme-codesys.com/en/libs/Standard/Current/Timer/TP.html`
  - `https://content.helpme-codesys.com/en/libs/Standard/Current/Counter/CTU.html`
  - `https://content.helpme-codesys.com/en/libs/Standard/3.5.18.0/Trigger/R_TRIG.html`
  - `https://content.helpme-codesys.com/en/libs/Standard/3.5.15.0/Trigger/F_TRIG.html`
- Siemens S7-1200 manuals and instruction docs:
  - `https://support.industry.siemens.com/cs/attachments/download/36932465/s71200_system_manual_en-US_en-US.pdf`
  - `https://cache.industry.siemens.com/dl/files/465/36932465/att_106119/v1/s71200_system_manual_en-US_en-US.pdf`
  - `https://docs.tia.siemens.cloud/r/en-us/v21/step-7-safety-v21-instructions/general/fbd/insert-binary-input-step-7-safety-v21`
- ESPHome official docs:
  - `https://esphome.io/components/output/ledc/`
  - `https://esphome.io/components/output/slow_pwm/`
  - `https://esphome.io/components/sensor/pulse_counter/`
  - `https://esphome.io/components/sensor/pulse_meter/`
  - `https://esphome.io/components/sensor/integration/`
  - `https://esphome.io/components/binary_sensor/analog_threshold/`

## Direct Findings

### 1. IEC / PLC Baseline Is Still Small And Primitive

The CODESYS Standard library still centers the baseline around:

- bistables:
  - `RS`
  - `SR`
- counters:
  - `CTD`
  - `CTU`
  - `CTUD`
- timers:
  - `TOF`
  - `TON`
  - `TP`
- triggers:
  - `F_TRIG`
  - `R_TRIG`

That is a strong confirmation that our primitive layer should stay small and composable.

It should not turn into a large collection of mechanism-specific semi-products.

### 2. Siemens Confirms The Same Core, Plus Compare/Math

The Siemens S7-1200 system manual explicitly calls out:

- timers
- counters
- compare
- in-range / out-of-range
- OK / Not OK
- math

This confirms that the industrial baseline is not just timers and counters.

It also consistently includes:

- boolean logic
- threshold and range decisions
- arithmetic conditioning

Inference from these sources:

- our base should definitely include:
  - compare / threshold
  - window / range logic
  - basic arithmetic conditioning
- and should not rely only on boolean helpers

### 3. ESPHome Adds Practical Duty / Pulse / Integration Building Blocks

ESPHome provides a very useful practical reference layer on top of primitives:

- fast PWM through `ledc`
- relay-safe duty control through `slow_pwm`
- pulse counting through `pulse_counter`
- low-rate pulse frequency through `pulse_meter`
- time integration through `integration`
- analog-to-boolean conversion through `analog_threshold`

This confirms several practical needs for our universal base:

- `pwm` must be first-class
- pulse counting must be first-class
- totalizer / integration must be first-class
- analog-to-digital thresholding must be first-class
- low-rate rate estimation is important enough to keep visible in the architecture

## Comparison Against Our Current Universal Block Base

### Already Covered Well

Our current base already covers the industrial baseline well:

- `logic_gate`
- `edge_detect`
- `latch`
- `selector`
- `timer`
- `threshold / comparator`
- `hysteresis / deadband`
- `freshness`
- `interlock`
- `mode_authority`
- `scale / offset`
- `difference`
- `counter`
- `totalizer`
- `window_aggregator`
- `sequence`

This means the current direction is fundamentally correct.

### Newly Confirmed As Mandatory

This pass raises the priority of these primitives:

#### `pwm`

This is no longer maybe useful later.

It is part of the minimum universal base.

Required direction:

- `fast_pwm`
- `slow_pwm`
- optional `pulse_train`

Why:

- modulating outputs
- relay-safe duty control
- heaters
- dosing pulses
- proportional on/off strategies

#### `rate_estimator`

This was already optional in our block base.

After this pass, it should be treated as strongly recommended.

Why:

- pulse-rate-based flow
- low-rate pulse measurement
- speed/frequency interpretation
- smoother instantaneous values than raw counting in fixed windows

#### `window_aggregator`

This remains mandatory.

Why:

- rolling totals
- 24h average flow
- daily and service statistics
- trend-style aggregation without a full historian

## What Should Stay Out Of Primitive Blocks

This pass does not justify moving these into raw blocks:

- boiler package logic
- flowmeter end-user package
- compressor duty/standby package
- button UX package as a product concept
- BWTS train package

Those remain:

- patterns
- modules
- custom modules
- composites

## Important Boundary Decisions

### Debounce

Do not force all debounce logic into one generic high-level block.

Split it by ownership:

- basic physical debounce:
  - `channel` / hardware conditioning layer
- semantic event handling such as:
  - short press
  - long press
  - double click
  - pulse qualification windows
  belongs in:
  - modules
  - or advanced block compositions

### PWM vs PID

Do not confuse these.

- `PID` is a control pattern / module family
- `PWM` is a primitive output behavior

They are related, but not the same layer.

### Flowmeter

Do not expose the whole chain as the default user workflow.

But the primitive base must still support the chain:

- conditioning
- thresholding
- edge detection
- counting
- rolling aggregation
- conversion

Reference:

- `docs/flowmeter-pattern-pack-v1.md`

## Final Judgement

The current universal block base is on the right course.

It already matches the industrial primitive baseline well enough.

The most important corrections now are:

1. treat `pwm` as mandatory
2. keep `rate_estimator` visible as a near-mandatory practical primitive
3. keep `window_aggregator` mandatory
4. keep arithmetic/conditioning in the primitive layer
5. resist turning end-user mechanism logic into raw blocks

## Product Consequence

The correct stack remains:

1. universal primitive blocks
2. universal control patterns
3. standard module templates
4. custom modules
5. composite mechanisms

This is still the right direction for:

- boiler
- flowmeter
- compressor automation
- BWTS / Technocross-like systems
- general-purpose marine machinery automation
