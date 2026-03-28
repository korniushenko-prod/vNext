# Full UI Review Plan v1

## Purpose

This document defines the practical review pass for the Web UI after the first usable:

- analog path
- comms path
- alarms
- sequences

are already implemented.

The goal is not to polish random screens.

The goal is to verify that the UI still serves the product vision:

`simple on top, powerful underneath`

and that the controller still sits in the intended space between:

- narrow dedicated devices like `Omron E5CC`
- heavy PLC stacks like `Siemens / WAGO`
- hobby automation like `ESPHome`
- consumer device lines like `Sonoff`

## Main Review Questions

Every review step should be judged against these questions:

1. Can a normal user understand what to do without reading the internal model first?
2. Can a commissioning engineer still reach the deeper model when needed?
3. Does the UI present tasks and mechanisms first, instead of internal objects first?
4. Does the screen help build real control behavior, not just edit configuration fragments?
5. Is the current tab helping the product become:
   - easier than a PLC
   - more industrial than ESPHome
   - more flexible than a dedicated single-purpose controller

## Review Rule

The review should happen one domain at a time.

For each domain:

1. user tests the current screen
2. feedback is written against the checklist below
3. issues are grouped into:
   - must fix
   - should improve
   - later polish
4. only then the implementation pass for that domain should start

## Review Order

1. `Overview`
2. `Channels`
3. `Blocks`
4. `Comms`
5. `Alarms`
6. `Sequences`
7. `Display`
8. cross-tab consistency pass

## Domain Goals

### 1. Overview

Target role:

- operator
- service
- quick system health

Review questions:

- Is it clear what controller this is and what it is doing now?
- Are the most important states visible without opening deep tabs?
- Does it feel like a dashboard or like a debug dump?
- Are alarms and sequence states understandable at a glance?

Must be true after review:

- the page explains controller state quickly
- health, alarms, active mechanism state and network identity are visible
- low-value engineering clutter is reduced

### 2. Channels

Target role:

- commissioning
- hardware/resource setup
- analog tuning

Review questions:

- Is it easy to understand the difference between local GPIO and external resource?
- Is analog setup understandable without knowing the runtime internals?
- Are live preview, calibration and source notes helping enough?
- Does the screen feel like “configure an input/output”, not “edit a config object”?

Must be true after review:

- simple digital channels are fast to create
- analog channels are understandable and tunable
- external analog is not noticeably more confusing than local analog

### 3. Blocks

Target role:

- commissioning
- logic building

Review questions:

- Does the user start from scenarios or from raw block taxonomy?
- Are timer/latch/logic helpers understandable in user terms?
- Is advanced logic still reachable without polluting the simple path?
- Does the block list help solve tasks or only show internal structure?

Must be true after review:

- common tasks begin from scenarios
- helper blocks remain available but do not dominate normal use
- editor fields appear only when relevant

### 4. Comms

Target role:

- commissioning
- external device integration

Review questions:

- Is `bus -> device -> external resource -> channel -> signal` understandable in practice?
- Is Modbus readable enough for a normal service engineer?
- Are quick actions reducing setup friction?
- Does the tab still feel manageable or already too engineering-heavy?

Must be true after review:

- common device setup is guided
- resource meaning is visible without opening many editors
- commissioning writes/reads are obvious enough

### 5. Alarms

Target role:

- operator
- service

Review questions:

- Is alarm state understandable without reading raw config?
- Is `active / pending / ack / severity` obvious enough?
- Does the user know what requires action?
- Does this feel like an operator/service alarm page rather than a JSON-backed editor?

Must be true after review:

- active alarms are readable and actionable
- service history is understandable
- alarm editing does not overwhelm the operator surface

### 6. Sequences

Target role:

- commissioning
- mechanism authoring
- service visibility

Review questions:

- Does the user understand a mechanism as states and transitions, not as low-level fragments?
- Are `waiting reason`, `fault reason`, `pending transition` actually useful?
- Is the mature actuator template enough to validate the model?
- Does the tab feel like a scenario editor or still too much like internal config editing?

Must be true after review:

- current state and next step are visible
- a real mechanism can be understood and adjusted from this tab
- the template proves the sequence model is usable

### 7. Display

Target role:

- operator
- local HMI setup
- service overlay

Review questions:

- Is it easy to put useful values on the display?
- Are system sources understandable?
- Is the display configured as a view over signals, not as a second logic engine?
- Can operator-facing information be built quickly enough?

Must be true after review:

- simple service/operator screens are quick to build
- widget editor is understandable
- signal/system source choice is clear

### 8. Cross-Tab Consistency

Review questions:

- Are the same concepts named consistently across tabs?
- Do status/quality/reason words match each other?
- Do `Operator / Commissioning / Advanced` still make sense everywhere?
- Do jumps between tabs feel like one product or several tools glued together?

Must be true after review:

- same concept, same naming
- same pattern for:
  - list
  - editor
  - summary
  - quick actions
  - dependency visibility

## Feedback Format

For each tested domain, feedback should be grouped as:

- what feels right
- what is confusing
- what feels too deep too early
- what is missing for real use
- what should become simpler
- what must stay available in advanced mode

## Severity

Use these categories:

- `must fix`
  - breaks comprehension or core workflow
- `should improve`
  - understandable but clumsy
- `later polish`
  - quality improvement without blocking use

## Success Criteria For The Whole Review

The review is successful when:

- the product still feels simpler than a PLC for medium tasks
- still feels more serious than ESPHome/Sonoff for real automation
- still feels more open than narrow dedicated devices
- ordinary work starts from user tasks
- advanced engineering depth remains available without dominating the experience
