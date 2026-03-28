# Module Instantiation And Setup Wizard v1

## Purpose

This document fixes one of the most important future product rules:

- a `module` is not only a visual card
- a `module` must instantiate real engine objects
- the user should create a module through a guided setup flow
- that flow must automatically create and prefill lower-layer primitives where possible

This document sits on top of:

- `docs/functional-module-model-v1.md`
- `docs/module-registry-spec-v1.md`
- `docs/module-first-ui-spec-v1.md`
- `docs/logic-ownership-matrix-v1.md`

## Main Rule

Future flow lines should be read as:

- `flow line`
  - consists of `modules` and `sequences`
- `module`
  - consists of `blocks`
  - and may also own a `sequence`
- `block`
  - is either purely virtual
  - or consumes/publishes `signals`
- if a module needs physical or external input/output bindings
  - the setup flow must create or bind the needed `signals`
  - and, when required, the needed `channels`

So the visible editing surface should be:

- modules
- sequences
- typed links

But the instantiated source of truth remains:

- `resources`
- `channels`
- `signals`
- `blocks`
- `alarms`
- `sequences`

This rule is now also explicit for future screen building:

- `Display` and `Service` screens should place:
  - module outputs
  - owned sequence outputs
  - selected generated block/signal values
- so module creation must also decide which internal generated values are exposed outward
- and which remain internal-only

## Why This Matters

Without this rule, the module-first layer would collapse into one of two bad outcomes:

1. only visual cards with hidden magic
2. pretty wrappers that still force the user to manually build every block and signal

The platform needs a middle path:

- the user works mainly with modules
- the engine still gets explicit primitives
- advanced users can inspect and edit the generated lower layer when needed

## Instantiation Pipeline

Creating a module should follow this pipeline:

1. choose module family
2. choose template
3. choose backend/capability profile
4. run setup wizard
5. validate required bindings and parameters
6. instantiate lower-layer objects
7. publish module interface
8. expose service/runtime status and display-ready values

## Module Instantiation Outputs

Instantiating one module may create:

- zero or more `channels`
- zero or more `signals`
- zero or more `blocks`
- zero or one owned `sequence`
- zero or more `alarms`
- one normalized module interface

It should also produce:

- generated-object ownership metadata
- generated-object preview data for the UI
- display/service exposure metadata

## Creation Rules By Layer

### 1. Channel Creation

Channels should be created only when:

- a module needs a real local hardware endpoint
- or a module explicitly binds to an external resource through channel binding

Examples:

- local relay output
- local digital input
- local analog input
- external resource bound into a channel

Channels should not be created:

- for purely derived helper logic
- just to mirror every internal block output

### 2. Signal Creation

Signals should be created when:

- a physical input needs normalization
- a block publishes a reusable derived result
- a module publishes stable interface outputs
- display/service/alarm/sequence needs a common language object

Examples:

- `fan_feedback`
- `fuel_temp.value`
- `pulse_extract.state`
- `pump.running`
- `module_x.ready`

### 3. Block Creation

Blocks should be auto-created when:

- the template requires primitive logic
- the user should not have to hand-build that primitive every time

Examples:

- threshold
- hysteresis
- edge detect
- counter
- latch
- interlock
- freshness

### 4. Sequence Creation

A sequence should be auto-created when:

- the module has named phases/states
- or the template is a scenario/orchestration function

Examples:

- burner start
- purge
- actuator start/wait feedback/run/fault

## Wizard Goals

The setup wizard should make module creation:

- easy for common cases
- still inspectable
- still extensible
- still compatible with advanced editing

The wizard should answer:

- what will be auto-created
- what still needs user binding
- what defaults were chosen
- what will be published outward
- what will be exposed to:
  - `Display`
  - `Service`
- which generated objects are still safe to edit later

## Wizard Structure

The preferred first wizard shape is:

### Step 1. Purpose

- what the module does
- short Russian explanation
- typical uses

### Step 2. Backend And Capability

- local / external / protocol / fallback mode
- discrete / analog / pulse / position / PID profile

### Step 3. Required Bindings

- source signal
- reset signal
- command target
- feedback signal
- optional enable/permissive/trip inputs

### Step 4. Parameters

- thresholds
- timers
- engineering units
- pulses per unit
- hysteresis width
- timeouts

### Step 5. Auto-Created Objects Preview

The user should see:

- channels to be created
- signals to be created
- blocks to be created
- alarms to be created
- sequence to be created

The preview should distinguish:

- `new`
- `bind existing`
- `generated internal`
- `generated published`
- `generated and display/service exposed`

### Step 6. Validation

The wizard should clearly show:

- missing required bindings
- invalid parameter ranges
- conflicting outputs
- impossible capability/backend combinations
- naming collisions

### Step 7. Create

Then instantiate:

- real lower-layer objects
- module interface outputs
- service-facing labels and display-ready values

## Autofill Matrix

The setup flow should treat fields in three classes.

### 1. Auto-Filled By Default

Examples:

- generated ids
- generated labels
- common units
- common edge direction
- typical timeout presets
- common output ids
- common display/service labels

The user may override these in advanced mode.

### 2. Required User Inputs

Examples:

- physical source binding
- command target binding
- engineering constant such as:
  - pulses per revolution
  - pulses per liter
  - threshold value if there is no sensible default
- explicit authority/backend choice when the template cannot infer it safely

### 3. Optional Advanced Overrides

Examples:

- exact generated id pattern
- internal helper naming
- advanced hysteresis shape
- validation timing window
- display/service exposure overrides

## What Should Autofill

The wizard should autofill whenever possible:

- generated IDs
- default labels
- common units
- default mode
- default edge direction
- standard timeouts
- typical threshold presets
- published output IDs
- display/service labels

Examples:

- `fan_rpm_1`
- `fan_rpm_1.counter`
- `fan_rpm_1.rate`
- `fan_rpm_1.value`
- `fan_rpm_1.fault`

## What Should Be Auto-Created

Examples by pattern:

### Pulse / Rate Extraction

Auto-created objects may include:

- source signal binding
- threshold/hysteresis block if analog extraction is selected
- edge detect block if needed
- counter block
- rate estimator block later
- published outputs:
  - `state`
  - `count`
  - `rate`
  - `fault`
- display/service exposures:
  - `state`
  - `rate`
  - `count` only when enabled by profile

### Measured Value

Auto-created objects may include:

- source signal binding
- range logic block(s)
- alarm thresholds
- published outputs:
  - `value`
  - `in_range`
  - `alarm_low`
  - `alarm_high`
  - `fault`
- display/service exposures:
  - `value`
  - `in_range`
  - active alarm/fault states

### Actuator With Feedback

Auto-created objects may include:

- command target binding
- feedback signal binding
- interlock block
- feedback timeout block or sequence
- published outputs:
  - `running`
  - `ready`
  - `fault`
  - `busy`
- display/service exposures:
  - `running`
  - `busy`
  - `fault`
  - `feedback_ok`

## Generation Decision Matrix

To avoid turning the module layer into uncontrolled autogeneration, module setup should follow this matrix.

### 1. Always Auto-Create

These should normally be created automatically by the module/template when missing:

- ownership metadata for generated objects
- internal helper blocks required by the template logic
- stable module interface outputs
- owned sequence objects when the template is sequence-based
- default display/service labels for published outputs

Examples:

- internal comparator block
- internal hysteresis block
- internal edge detect block
- module outputs like:
  - `ready`
  - `fault`
  - `value`
  - `rate`

Reason:

- these are structural parts of the template itself
- forcing the user to hand-build them would defeat module-first authoring

### 2. Auto-Create Sometimes

These may be auto-created when the wizard determines they are required and no suitable existing object is bound:

- normalized signals for physical/protocol inputs
- normalized signals for physical/protocol outputs when feedback/status needs a common signal layer
- derived reusable signals explicitly marked as:
  - display-worthy
  - service-worthy
  - alarm/sequence-worthy
- alarms owned by the template

Examples:

- `fan_feedback`
- `fuel_temp.value`
- `flow_pulse.state`
- `pump.running`

Reason:

- these are useful common-language objects
- but they should not be duplicated if a suitable signal already exists

Rule:

- prefer `bind existing`
- only then `create normalized signal`

### 3. Suggest To Create

These should often be offered by the wizard, but not silently created without user confirmation:

- new hardware-bound channels
- external-resource-backed channels
- public derived signals not strictly required by the module
- optional display/service helper outputs
- optional alarm objects
- optional sequence extras not required by the selected template/profile

Examples:

- extra display-friendly engineering signal
- optional warning alarm
- optional trend/debug signal
- optional exported count-total signal

Reason:

- these are valuable, but not always wanted
- silent creation here would increase config noise quickly

### 4. Never Auto-Create

These should not be silently created by a module wizard:

- arbitrary unrelated hardware channels
- duplicate normalized signals when an equivalent one already exists
- cross-module typed links not chosen by the user
- global display widgets/screens
- broad event/history policies
- mechanism-level objects outside the template scope

Examples:

- creating extra relay channels “just in case”
- auto-linking one module to another unrelated module
- auto-creating a dashboard screen without user consent

Reason:

- this would hide system structure
- make regeneration unsafe
- and turn module creation into uncontrolled project mutation

## Source Binding Rule

Blocks should not bind directly to raw physical details when a normalized signal layer is needed.

Preferred order:

1. physical/local/protocol source
2. normalized signal
3. generated block(s)
4. published module output

This means:

- if the template needs a physical input and no suitable signal exists yet
  - the wizard should offer to create the normalized signal automatically
- if a suitable signal already exists
  - the wizard should prefer binding to it
- only advanced mode should make the user hand-build every intermediate object

The practical rule should now be treated as:

- `bind before create`
- `publish only what is useful`
- `do not duplicate normalized objects`

## Flow View Consequence

Future `Flow View` should display:

- modules
- sequences
- typed links between them

It should not dump every internal helper block by default.

But each module should offer:

- `Open internals`
- `Show generated blocks`
- `Show published signals`
- `Show display/service exposed values`

So users can:

- stay in the simple flow view
- or drill down when they need full control

## Display Consequence

When building display/service screens, the preferred sources should be:

- module interface outputs
- owned sequence status outputs
- selected derived block outputs when explicitly exposed

This means module creation should also define:

- which values are display-worthy
- which statuses are service-worthy
- which outputs should stay internal only

The same rule should later allow screen-building UIs to insert values like:

- module status
- module fault
- current measured value
- derived rate
- owned sequence current state

without asking the user to reconstruct internal helper chains manually.

## Required Validation Facets

At minimum the wizard should validate:

- required binding completeness
- duplicate IDs
- missing source signals
- missing command target
- unsupported capability/backend combo
- output publish collision
- impossible parameter range
- cyclic internal reference where not allowed

## Editing Rule

After a module is created:

- the user should be able to edit it at module level
- the lower layer should remain inspectable
- advanced users may edit generated blocks/signals directly
- but the system should preserve traceability from generated primitives back to the owning module

The preferred edit model should be:

- simple edit:
  - work only at module/template/profile level
- advanced edit:
  - inspect and optionally tune generated lower-layer objects
- regeneration review:
  - show what will be recreated, preserved or conflicted on save

Generated-object editing should also respect this rule:

- internal structural helpers may be regenerated safely
- published outputs need stable ids and should be changed carefully
- bound existing signals/channels should not be recreated automatically
- optional generated objects may be removed or added through the wizard/profile settings

## Traceability Rule

Every generated object should store ownership metadata like:

- `generated_by_module`
- `generated_role`
- `template_origin`

So the UI can explain:

- what created this block
- whether it is safe to edit manually
- whether regeneration may overwrite it

This is also required for future cleanup, export, publish-as-custom-module, and display/service dependency review.

## Delivery Rule

Before deeper module-first UX expands, we should treat this as mandatory:

- module registry
- template registry
- instantiation rules
- setup wizard rules
- generated-object traceability

Otherwise the product will drift back into object-first editing.
