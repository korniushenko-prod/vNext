# Test Bench Spec v1

## Purpose

This document captures the future test bench direction for the main controller.

It is intentionally being fixed now so the idea does not get lost, but implementation is deferred until after the current main feature set and full UI review.

## Main Board Assumption

Current main reference target:

- `LilyGO T3`

The first test bench should therefore be built around validating the main-controller firmware behavior against this class of target.

## Test Bench Goals

The test bench should help validate:

- logic correctness
- signal flow correctness
- feedback behavior
- response time
- timing stability
- communication behavior
- failure handling

## Minimum Capabilities

### Digital

- digital input switches/buttons
- digital output indicators
- feedback loop simulation for outputs
- fault injection for stuck or missing feedback

### Analog

- adjustable analog source
- known reference points for calibration
- repeatable raw input stimulation
- optional external ADC/DAC headers

### Timing / Pulses

- pulse generator input
- repeatable frequency source
- timer and counter validation

### Communications

- I2C headers
- serial/RS485 access
- easy connection to future satellites

### Service / Observation

- logic-analyzer-friendly pins
- test points for multimeter/oscilloscope
- visible LED/state indicators

## What Should Be Measured

Not only functional pass/fail, but also:

- input-to-output latency
- timer jitter
- pulse loss
- analog scaling accuracy
- clamp/filter behavior
- startup output state
- behavior after reboot
- behavior on comm loss
- behavior on missing feedback

## Future Role In Development

Once the current main feature set is complete and the UI has gone through a full revision:

- the test bench becomes the preferred validation platform for the main controller
- future satellites can be tested against it as smart peripherals

Future satellite classes expected around the bench:

- `ESP32-C3` compatibility/dev satellites
- simple custom satellites based on `RP2040` or `STM32G0/C0`
- motion satellites based on `STM32G4`

## Current Status

Planned and approved.

Implementation is intentionally deferred until:

- current main-controller functionality is completed further
- current UI has gone through a full review pass
