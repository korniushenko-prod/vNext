# Logic Ownership Matrix v1

## Purpose

This document fixes what belongs in:

- `Channels`
- `Signals`
- `Blocks`
- `Sequences`
- `Modules`
- `Composite Mechanisms`

It exists to prevent feature drift where the same idea appears in several places with different UX.

## Core Rule

The product should grow upward by abstraction.

That means:

- lower layers stay small and universal
- higher layers become more user-facing and task-oriented

The user should mostly work in:

- `Modules`
- `Composite Mechanisms`

Advanced users may drop into:

- `Channels`
- `Signals`
- `Blocks`
- `Sequences`

## Layer 1: Channels

Owns:

- physical bindings
- transport-specific resources
- GPIO and bus-backed endpoints
- basic electrical or transport semantics

Examples:

- digital input pin
- relay output
- analog input front-end
- Modbus register binding
- external resource path

Allowed behavior:

- invert
- raw range
- basic debounce
- basic filter
- source/driver metadata

Should not own:

- process logic
- scenario timing
- mechanism behavior

## Layer 2: Signals

Owns:

- normalized values
- normalized statuses
- published events/states

Examples:

- `fuel_temp.value`
- `boiler.level.value`
- `button_1.short_press`
- `fan.running`
- `sequence.boiler.running`

Should not own:

- rich control policy
- mechanism orchestration

## Layer 3: Blocks

Owns:

- atomic reusable primitives
- universal logic bricks
- advanced engineering tools

Keep in `Blocks`:

- `timer`
- `logic_gate`
- `comparator / threshold`
- `hysteresis`
- `latch`
- `selector`
- `edge_detect`
- `freshness`
- `interlock`
- `mode_authority`
- arithmetic / conditioning primitives
- counting / aggregation primitives

Timer rule:

- `Blocks` should have a small timer primitive set
- not a giant user-facing timer wizard

Preferred primitive timer modes:

- `on_delay`
- `off_delay`
- `pulse`
- `min_on`
- `min_off`
- optional `interval_tick`

Additional primitive direction:

- `difference`
- `scale / offset`
- `clamp`
- `counter`
- `totalizer`
- `window_aggregator`

Should not own as first-class user UX:

- pump anti-slosh module behavior
- button product behavior
- boiler low/high fuel mode policy
- burner flame supervision policy

Those belong one layer higher.

## Layer 4: Sequences

Owns:

- named states
- transitions
- phase timing
- waiting/fault reasons
- per-state actions

Use `Sequences` when there are:

- phases
- transitions
- restart/reset behavior
- timeout or dwell semantics
- explainable reasons

Examples:

- purge
- ignition
- run
- cooldown
- post-purge

Should not become:

- a replacement for all timers
- the default place for every simple relay pattern

## Layer 5: Modules

Owns:

- user-facing functions
- domain logic
- task-oriented tuning
- internal helper composition

This is the main product layer.

Modules may internally use:

- channels
- signals
- blocks
- sequences

But the user should see:

- thresholds
- hysteresis
- min on/off
- timeout
- mode
- alarm policy

not raw low-level helper plumbing.

Examples:

- `Button Module`
- `Cyclic Output Module`
- `Level On/Off Control Module`
- `Fuel Temperature Module`
- `Fuel Heater PID Module`
- `Flame Supervision Module`
- `Fan Actuator Module`
- `Burner Sequence Module`

## Layer 6: Composite Mechanisms

Owns:

- grouping of modules into one mechanism
- mechanism-level interfaces
- reusable multi-module patterns

Examples:

- boiler
- incinerator
- pump group
- ignition unit

## Decision Matrix

### Example: Simple cyclic relay on/off

User-facing owner:

- `Module`

Recommended shape:

- `Cyclic Output Module`

Internal implementation may use:

- small timer primitive
- or a tiny internal sequence

Do not make the normal user assemble this from raw timer blocks.

### Example: Button with debounce, long press, double click

Physical owner:

- `Channel`

User-facing behavior owner:

- `Module`

Recommended shape:

- `Button Module`

Published outputs:

- `pressed`
- `released`
- `short_press`
- `long_press`
- `double_click`
- `held`

Internal implementation may use:

- `edge_detect`
- timer primitive
- latch if needed

### Example: Boiler water level

Measured value:

- `Module`
  - `Measured Value`

Control behavior:

- `Module`
  - `On/Off Control`

Protection behavior:

- separate `Module`
  - `Trip / Alarm Policy`

This must not be collapsed into one opaque giant object.

### Example: Burner flame supervision

Should be a module-level policy with sequence awareness.

Not just:

- one raw digital input

And not just:

- one free-floating alarm block

Recommended shape:

- `Flame Supervision Module`

Which internally reacts differently by sequence phase.

### Example: Flowmeter

Physical source owner:

- `Channel`

Normalized derived values:

- `Signal`

Internal primitive composition:

- `difference`
- `threshold / hysteresis`
- `edge_detect`
- `counter / totalizer`
- `window_aggregator`

User-facing owner:

- `Flowmeter Module`

Reference:

- `docs/flowmeter-pattern-pack-v1.md`

## Practical Product Rule

### Blocks

Use for:

- primitives
- advanced engineering
- internal composition tools

### Sequences

Use for:

- scenario logic
- state machines
- phase timing

### Modules

Use for:

- almost all user-facing configuration
- reusable domain functions
- meaningful tuning
- future custom modules published from reusable compositions

### Custom Modules

Use when:

- the same composition is needed more than once
- the user wants a clear reusable interface

Reference:

- `docs/custom-module-authoring-v1.md`

## Boiler-Specific Summary

For the boiler pilot:

- `Steam Pressure Demand` should be a module
- `Burner Run Sequence` should be a sequence-backed module
- `Fuel Temp + Heater PID` should be one or more modules
- `Low/High Fuel Solenoid Policy` should be a module
- `Water Level Control` should be a module
- `Low-Low Water Trip` should be a separate module
- `Flame Supervision` should be a module

## Boiler Walkthrough: From Primitive To Mechanism

This is the preferred mental model for the boiler pilot.

### 1. Physical input or output starts in Channels

Examples:

- water-level float switch
- analog fuel temperature input
- burner flame detector input
- fan relay output
- low/high fuel solenoid outputs

### 2. Signals normalize what the runtime should reason about

Examples:

- `boiler_level.value`
- `fuel_temp.value`
- `flame_fb`
- `fan.running`
- `fuel_mode.low`

### 3. Blocks stay small and universal

Use blocks only for the reusable primitive part:

- `hysteresis`
- `threshold`
- `min_on`
- `min_off`
- `edge_detect`
- `selector`
- `interlock`

Do not expose these as the main language for normal boiler configuration.

### 4. Sequences own named phases

Use sequence when there is a true phase machine, for example:

- `purge`
- `ignition`
- `run`
- `post-purge`
- `fault recovery`

Do not move constant control loops like boiler water-level control into sequence just because they also use timers.

### 5. Modules are the user-facing owner of behavior

Examples:

- `Fuel Temperature Module`
- `Fuel Heater PID Module`
- `Steam Pressure Demand Module`
- `Level On/Off Control Module`
- `Low-Low Water Trip Module`
- `Flame Supervision Module`
- `Fuel Mode Module`
- `Burner Sequence Module`

These modules may internally use blocks and sequences, but the user should mostly tune:

- thresholds
- hysteresis
- min on/off
- timeout
- alarm policy
- mode / authority

### 6. Composite mechanism is the boiler itself

The whole boiler should be shown as several parallel lanes, not one giant sequence:

- demand lane
- combustion lane
- fuel preparation lane
- water-level control lane
- low-low water protection lane
- chemistry / blowdown lane
- master stop / trip lane

Reference visual mapping:

- `docs/boiler-abstraction-map-example-v1.html`
- `docs/boiler-flow-view-example-v1.html`

## Product Consequence

This matrix means:

- `Blocks` remain available for advanced engineering and internal module composition
- `Sequences` remain the right place for phase-based behavior
- `Modules` become the default language for configuring real machinery
- `Flow View v2` should show module lanes and policy paths, not raw helper chains
- `Critical Stop Policy` should be a module

## Immediate Implication

Future UI work should follow this order:

1. keep `Blocks` simple
2. keep `Sequences` scenario-focused
3. move more user-facing behavior into `Modules`
4. show `Composite Mechanisms` as the mechanism-level surface
