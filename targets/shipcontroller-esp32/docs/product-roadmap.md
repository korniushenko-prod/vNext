# Product Roadmap

## Vision

Create a web-native marine process controller on ESP32 that combines:

- PLC-style logic
- PID control
- signal conditioning
- sequence/state-machine control
- modular I/O and communications
- diagnostics and service from Web UI

The product is not "firmware for one task".

The product is:

`Core + Templates + Channels + Blocks + Sequences + Service UI`

Implementation tracking:

- roadmap progress and what is actually done right now are maintained in `docs/implementation-status.md`
- practical next-step planning for Analog I/O and communications is maintained in `docs/analog-io-and-comms-roadmap-v1.md`
- external analog expansion planning is maintained in `docs/external-adc-dac-roadmap-v1.md`
- the currently agreed staged delivery order for external analog, DAC, and Modbus is maintained in `docs/external-analog-delivery-pack-v1.md`
- the current long-run execution path up to the first sequence engine is maintained in `docs/major-update-roadmap-to-sequence-v1.md`
- platform scaling and multi-target strategy is maintained in `docs/platform-scaling-strategy-v1.md`
- future main-controller bench direction is maintained in `docs/test-bench-spec-v1.md`
- visual editing direction is maintained in `docs/visual-editor-strategy-v1.md`
- functional modules above the current engine are maintained in `docs/functional-module-model-v1.md`
- the first pilot decomposition of a real mechanism is maintained in `docs/boiler-pilot-module-map-v1.md`
- the first module-first UI target is maintained in `docs/module-first-ui-spec-v1.md` and `docs/boiler-module-first-ui-v1.md`
- the registry model for module-first authoring is maintained in `docs/module-registry-spec-v1.md`
- the universal control-pattern direction above individual mechanisms is maintained in `docs/universal-control-pattern-library-v1.md`
- the universal reusable block base is maintained in `docs/universal-block-base-v1.md`
- the first competitor-analysis pass for that block base is maintained in `docs/competitor-analysis-universal-block-base-v1.md`
- the current dual pilot validation scope is maintained in `docs/pilot-reference-scope-v1.md`
- reusable user-authored composition is maintained in `docs/custom-module-authoring-v1.md`
- the first flowmeter-specific pattern pack is maintained in `docs/flowmeter-pattern-pack-v1.md`
- the next UI regrouping around hardware vs automation vs service is maintained in `docs/pattern-first-ui-reorganization-v1.md`
- the first Russian-first user-facing pattern/template registry is maintained in `docs/russian-pattern-template-registry-v1.md`
- the shared pulse/rate extraction pattern is maintained in `docs/pulse-rate-extraction-pattern-v1.md`
- the scenario-first project authoring direction is maintained in:
  - `docs/scenario-first-authoring-model-v1.md`
  - `docs/editor-first-product-direction-v1.md`
  - `docs/json-project-model-v2.md`
  - `docs/scenario-first-authoring-vision-v1.html`
  - `docs/scenario-first-ui-design-v1.html`
  - `docs/scenario-authority-layout-boiler-v1.html`
  - `docs/scenario-simple-workspace-v1.html`
- the non-blocking runtime rules for future modules and sequences are maintained in:
  - `docs/module-runtime-contract-v1.md`
  - `docs/sequence-contract-v1.md`

For the current long-run pack, the structure is now explicitly:

- delivery phases
- plus cross-cutting support tracks

The delivery phases move functionality forward.

The support tracks prevent later collapse of:

- config compatibility
- memory budgets
- event/history visibility
- text/state presentation
- future visual authoring consistency

## Visual Editing Direction

The approved direction for future visual editing is now:

- first pivot the product shell toward an `editor-first` main experience
- then stabilize the project model and compiler contract behind that editor
- then connect the editor to the existing runtime through generated internals
- then add richer state/flow editing and project-level explain/debug
- only later expand template libraries and advanced graph tooling

Explicit non-goals for the first visual editor:

- not a generic Node-RED-style full freeform canvas
- not a ladder runtime
- not a second hidden logic engine

Current live implementation rule:

- the editor should visually lead the product
- low-level object screens remain available, but no longer define the product identity
- each visual pass should move the UI closer to:
  - left project tree
  - central state/flow workspace
  - right inspector/explain
  - generated internals preview separated from the main canvas

Current active editor sequence:

1. make the editor visually calmer and closer to the approved reference
2. make the center area feel like a real canvas, not generic nested cards
3. reduce sidebar and inspector visual noise so the center workspace leads
4. compress the editor header into a lighter toolstrip
5. remove obvious cosmetic roughness in the editor shell
6. improve node-card readability inside the central canvas
7. remove leftover outer shell noise around the editor
8. implement `JSON Project Model v2` in the live editor layer
9. build generated internals preview from that model
10. connect `Test 1` editor path to real compiler/materialize behavior
11. extend to `Flowmeter`
12. only then validate the complex `Boiler` path against the same editor
13. keep `Test 1` visually honest:
  - the canvas must show the full agreed block chain
  - do not collapse multiple logical blocks into only three visual group containers
  - preserve visible signal-flow links so logic can be traced by eye

Current progress inside that sequence:

- step 8 is now done at the first live level:
  - the editor renders from in-memory `project_model_v2`
- step 9 is now started for real:
  - the editor now shows a first generated preview of:
    - `signals`
    - `blocks`
    - `sequences`
    - `links`
  - this preview is still UI-side and reference-driven
  - it is not yet backend persistence or a full compiler/materializer
- the next meaningful editor step is therefore no longer another placeholder preview pass
- it is:
  - connect `Test 1` editor graph to real materialize behavior
  - keep the same `project_model_v2` as the source of truth

Current visual correction inside `Test 1`:

- the main flow no longer visually pretends the scenario is only:
  - source
  - logic
  - command
- instead, the editor now renders the agreed six-block chain explicitly
- this is now the required rule for future `Test 1` passes:
  - visual structure must match the real control semantics
  - signal-flow readability takes priority over oversized lane grouping
- the next visual rule is now also explicit:
  - the primary chain must show visible connectors between blocks
  - users should be able to follow the logic from left to right without leaving the canvas
- delivery rule:
  - every major editor visual pass must also bump asset versioning when needed
  - otherwise browser cache can mask real UI progress and make validation misleading
- model rule:
  - `Test 1` project-model revisions must be migrated forward automatically
  - old stored editor models must not keep the UI stuck on obsolete three-node layouts
- visual rule:
  - node cards in `Test 1` should expose their role and ports directly on the canvas
  - the editor should converge toward:
    - typed node headers
    - visible input/output ports
    - connector labels that describe actual port-to-port flow
  - compact cards are preferred over large inspector-like panels inside the canvas
  - actual wires should become the main explanation layer for the primary chain
  - `Input Behavior` and similar transformation nodes must validate compatibility with their upstream source, not only their own local fields

Current progress inside that connection step:

- the editor now has a first live bridge to the existing `Test 1` materialize backend
- from `Generated internals preview`, the user can:
  - open the equivalent `Test 1` workspace in `Modules`
  - trigger `Materialize Test 1 в runtime`
- this is intentionally a bridge, not a separate second compiler
- next refinement after this bridge:
  - stop relying on fixed `start_button / relay_1` assumptions
  - let `project_model_v2` carry enough binding/parameter data for the editor to drive that path more directly

Current progress in that refinement:

- `Test 1` nodes in `project_model_v2` now already carry the first node-level:
  - `bindings`
  - `params`
- the editor bridge now forwards those values into the reusable `Modules` materialize path
- next step after this:
  - move from preset defaults to true editor-side editing of those bindings/params

Current progress in that next step:

- the editor inspector now edits the first `Test 1` node bindings/params directly in `project_model_v2`
- this turns the current editor path into a real loop:
  - edit
  - preview
  - bridge
  - materialize
- the next refinement after that should be:
  - persist project model changes beyond the in-memory editor session
  - and then widen the same pattern from `Test 1` to `Flowmeter`

Current progress in that persistence step:

- the editor now stores:
  - `project_model_v2`
  - editor UI state
  in browser `localStorage`
- this gives the editor the first real persistence layer without waiting for backend project storage
- backend project storage and load/save contract are now also started:
  - separate API:
    - `GET /editor-project-model`
    - `POST /editor-project-model`
  - primary storage now uses controller-side NVS / `Preferences`
  - legacy `LittleFS` editor-project file is only a migration fallback
- the next runtime-visibility refinement is now also started:
  - `Test 1` materialize now stores generated ownership metadata on runtime blocks
  - editor preview now shows:
    - materialized generated blocks
    - ownership/role
    - runtime-loaded vs config-only state
    - a first service-style timer/command summary line
- the next `bind -> preview -> materialize -> inspect result` refinement is now also started:
  - the editor inspector now contains explicit readiness checks for `Test 1`
  - the editor inspector now contains a direct `Inspect result` section with:
    - materialize action
    - quick jumps to `Signals / Channels / Blocks`
    - timer phase / remaining
    - short service text
- the next reduction of `Editor -> Modules` bridge feel is now also started:
  - the editor inspector can now create missing source/command I/O points directly for `Test 1`
  - this keeps more of the basic small-project path inside `Редактор`
- the next reduction of bridge feel during materialize is now also started:
  - `Test 1` materialize now runs directly from the editor
  - it no longer has to hop through `Modules` for the basic runtime path
- the next result-presentation refinement is now also started:
  - `Inspect result` for `Test 1` now begins with an operator-style service strip
  - technical timer/runtime details remain available, but are no longer the first thing the user sees
- the next discrete-point UX clarification is now also started:
  - `Источник` now explicitly means:
    - existing signal
    - or create signal from channel
  - `Команда` now explicitly means:
    - existing channel
    - or create channel
- that clarification is now also reflected at node-edit level:
  - the discrete source node owns its own source-mode choice
  - the command node owns its own channel-mode choice
- the next `Test 1` UX tightening is now also started:
  - readiness is no longer a separate card above the result
  - required fields are validated inline inside the node settings themselves
  - optional fields remain neutral
  - interval-style timer profiles now require `OFF time > 0`
- the next `Test 1` conceptual tightening is now also started:
  - raw source and button behavior are no longer treated as the same node
  - `Test 1` is now moving to the more correct control chain:
    - raw source
    - input behavior
    - run latch
    - enable gate
    - cyclic timer
    - command
  - this is the approved direction before moving to `Flowmeter`
- the `Test 1` runtime result wording is now also tightened:
  - `Inspect result` should explain the next action
  - not just report `Нет runtime`
- the timer input semantics in `Test 1` are now also aligned:
  - the editor should show which signal path actually drives the timer
  - in the current `Test 1`, this is now `logic_enable_gate.timer_enable`
- the signal-flow trace requirement is now explicit:
  - node cards should show what signal comes in and what signal goes out
  - users should be able to visually trace:
    - raw input state
    - behavior outputs like `short_press / double_press / held`
    - latch output
    - gate output
    - timer output
  - this is now part of finishing `Test 1`, not a later cosmetic enhancement
- next step after this:
  - validate the full save/reload loop against the real device
  - finish the remaining `Test 1` end-to-end UX:
    - remove the remaining duplication/noise around Test 1 setup
    - decide whether `Команда` needs the same level of role/contract explicitness as `Источник`
    - add live signal-flow visibility directly on nodes and links
  - only then reuse the same editor-side pattern for `Flowmeter`

Reference:

- `docs/visual-editor-strategy-v1.md`
- `docs/functional-module-model-v1.md`

## Functional Module Direction

The approved architectural direction above the current engine is now:

- keep the current runtime source of truth:
  - `resources`
  - `channels`
  - `signals`
  - `blocks`
  - `alarms`
  - `sequences`
- add a functional-module layer above it
- make future authoring increasingly module-first
- keep low-level editors available for advanced work

The first universal module families are now explicitly:

- `Operator IO Module`
- `Measured Value Module`
- `On/Off Control Module`
- `PID Control Module`
- `Actuator Module`
- `Protocol Interface Module`
- `Sequence Module`
- `Alarm Policy Module`
- `Composite Module`

Reference:

- `docs/functional-module-model-v1.md`
- `docs/module-runtime-contract-v1.md`
- `docs/sequence-contract-v1.md`
- `docs/universal-control-pattern-library-v1.md`

Immediate module-first authoring order after the first registry/UI skeleton:

1. `validation/status layer for modules and links`
2. `flow view v1`
3. deeper sequence-first visual authoring

Current conceptual correction above that order:

- the future authoring surface should become scenario-first
- every project should start with root `Main`
- users should then add:
  - modules
  - and only when needed, child sequences
- this should let simple projects stay simple and let complex projects grow without changing firmware

Current UI direction clarification:

- for now the working target is the expanded/advanced-capable UI
- it should be reorganized before simplification layers are added on top
- the next regrouping should separate:
  - board/chip/hardware setup
  - automation logic and patterns
  - service/runtime observation

Important product rule:

- keep boiler as a pilot validation case
- do not let boiler become the primary product abstraction
- align future modules and templates with universal control patterns that also cover:
  - flowmeter packages
  - compressor automation
  - BWTS-like systems

Next architecture clarification:

- any reusable logic should be buildable from the standard universal block base
- repeated compositions should be publishable as custom modules
- flowmeter should be treated as the first strong non-boiler pattern-pack example
- future competitor-analysis passes should validate that this universal base stays broad enough as it expands

Current note:

- the first competitor-analysis pass is now done
- it confirms that `pwm` belongs in the universal primitive base
- it confirms that `rate_estimator` and `window_aggregator` are important practical primitives beyond the narrow IEC baseline
- the current two practical validation references are now:
  - `boiler`
  - `flowmeter`

Immediate next step:

- align module templates and future UI around the fixed universal block base and pattern library
- add Russian pattern/module help for the first core patterns

Current correction:

- after comparing the current product shape with the new reference mockup, the next main correction is now explicit:
  - stop treating object-first configuration as the long-term main entry
  - start treating `Editor -> JSON Project -> Compiler -> Existing Runtime` as the main product path
  - keep `Channels / Signals / Blocks / Sequences` as the advanced/runtime layer underneath it

- before the next broader module/template pass, the project should finish stabilizing the `Blocks` authoring path
- the reason is practical:
  - runtime primitives for the flowmeter branch already exist
  - but user value is still limited by the reliability of `edit -> save -> reopen`
- the next high-value functional order is now:
  1. reliable `Blocks` authoring/save path
  2. `Flowmeter Pattern Pack v1` as guided setup
  3. flowmeter service/display outputs
  4. `PWM`
- current clarification inside step 1:
  - `/blocks` must not hide config entries just because runtime apply failed
  - broken or partially configured blocks must remain visible/editable/deletable as `config_only`
  - otherwise the user loses recovery tools exactly when they are needed most
- another newly confirmed system correction is now queued right after block-editor stabilization:
  - separate mutable live config from the uploaded `LittleFS` Web UI image
  - current `/config.json` in `LittleFS` is at risk of being overwritten by `uploadfs`
- next concept-shaping UI target after that stabilization:
  - live `Editor`
  - `Project Explorer`
  - root `Main`
  - `State mode`
  - `Flow mode`
  - explicit generated internals preview
  - later `JSON Project Model v2`
  - later compiler/materialization pass into the existing runtime
- first-screen simplification rule above that target:
  - the first editor workspace should be calmer and smaller than the earlier concept mockups
  - prefer:
    - left `Project`
    - center selected `State / Flow`
    - right `Inspector`
  - visually, the editor should feel like its own tool:
    - dedicated workspace top bar
    - dedicated sidebars
    - dedicated stage surface
    - not just generic settings cards rearranged into columns
  - keep `ON/OFF`, `AUTO/MANUAL`, `LOCAL/REMOTE` as a compact top context instead of a full extra column
  - keep generated internals and runtime graph out of the first screen by default
  - use dedicated `Advanced` access instead
- rollback / pivot decision:
  - do **not** roll back the runtime base
  - do **not** roll back implemented primitives:
    - `counter`
    - `totalizer`
    - `rate_estimator`
    - `window_aggregator`
    - `signal_extractor`
    - retained storage
    - sequence runtime
  - do apply a controlled pivot in authoring and UI:
    - stop treating raw `Blocks` as the long-term primary entry point
    - stop growing mechanism-specific or oversized modules as the main user surface
    - redirect future UX toward:
      - `Project`
      - `Main`
      - smaller composable modules
      - optional child sequences
      - generated internals preview
- keep `boiler + flowmeter` as the two practical functional references while doing that
- make pulse/rate extraction a shared reusable pattern instead of a flowmeter-only setup concept
- keep the live UI regrouping explicit and progressive:
  - first-level navigation:
    - `Обзор`
    - `Аппаратная часть`
    - `Автоматика`
    - `Сервис`
  - `Modules` should scale as a catalog with semantic groups and search, not as a long template wall
  - `Blocks` should scale as a primitive catalog with grouped quick-add sections and visible placeholders for agreed missing primitives
  - after each visible UI pass, sync both `docs/implementation-status.md` and this file
  - keep shell-split regressions contained:
    - missing fragment nodes must not crash global UI init
    - restore the full `blockModal` fragment before doing more block-editor UX work
  - keep shell navigation dense and phone-first:
    - first-level sections may stay as compact top tabs
    - second-level navigation may stay as a compact full button row when that is faster and clearer than a dropdown
    - keep the visible order explicit:
      - row 1 = first-level sections
      - row 2 = active subsection buttons
    - keep row 2 visually subordinate to row 1:
      - calmer surface
      - stronger text contrast
      - softer active state
  - keep shell styling compact and dark:
    - Android-like dark surfaces
    - green accent
    - minimal wasted vertical space in the header
- the short execution order inside that UI regrouping is now:
  1. stabilize block editor and config safety
  2. add config/storage separation for mutable live project data
  3. validate the first simple-project scenario-first path
  4. build simplified `Project Explorer + Main`
  5. define small composable module catalog
  6. add child sequence authoring from inside `Main`
  7. expose generated internals preview
  8. only then revisit broader module/template registry UX
- current model clarification for `Test 1` and future scenario-first authoring:
  - controller input and output should not be treated as two unrelated object families
  - the configured object underneath remains one `I/O point / channel`
  - scenario UI may still present different roles:
    - source
    - logic
    - command / actuator
  - the first small modules should increasingly follow that wording:
    - `Дискретная точка / Источник`
    - `Таймер`
    - `Дискретная точка / Команда`
  - the first live authoring path should work both:
    - as a preset demo
    - and in a blank `Main` workspace once the same small trio is assembled manually
  - blank-project quick start should stay action-oriented, not read like static documentation
  - the top shell/header should stay compact and never dominate the first screen over the actual workspace
  - mode explanation belongs inside the compact controller header area, not as a second full-width banner below it
  - language selection in the shell should be a compact top-level toggle, not a large card/select that wastes phone space
  - controller summary cards should not survive as a second large hero column on phones
  - the preferred shell shape is now:
    - title
    - compact `RU / EN`
    - compact mode select
    - one compact meta row with:
        - mode title above its description
      - controller status block without extra heading text
  - when possible, that shell status block should be one tap target leading to the relevant setup page instead of several small buttons
  - first-level sections should never look broken in operator mode:
    - keep at least one useful child page visible for `Аппаратная часть`
    - keep at least one useful child page visible for `Сервис`
- the current short functional execution order is now explicitly:
  1. finish block-authoring reliability
  2. separate mutable project config from uploaded Web UI `LittleFS` image
  3. validate `Test 1` as the first real simple project:
     - `Button`
     - `Timer`
     - `Relay`
     - root `Main`
     - calm scenario workspace
  4. make `Flowmeter Pattern Pack v1` a real guided scenario/module flow
  5. expose flowmeter operator/service outputs
  6. build scenario-first entry:
     - `Project Explorer`
     - root `Main`
     - child sequences
  7. convert the first small module set to this model:
     - `Input / Button`
     - `Timer`
     - `Discrete Output`
     - `Cyclic Output`
     - `Signal Extractor`
  8. then add `PWM`
- current practical state of that order:
  - `Counter` is done
  - `Totalizer` is done
  - `Rate Estimator` is done
  - the first live `Test 1` UI slice is now present in `Modules` as:
    - `Demo: Button + Timer + Relay`
  - this validates the calmer first-screen direction before deeper flowmeter and sequence UX work
  - `Window Aggregator` is done
  - `Signal Extraction / Tuning` is now done enough for the current stage:
    - real `signal_extractor` primitive exists
    - it already supports digital, threshold and differential source modes
    - it publishes both state and debug value
  - `Flowmeter Pattern Pack v1` is now entered as the active next refinement:
    - first runtime-pack materialization exists under `Pulse / Rate Extractor`
    - next step is to make that path cleaner and more guided
  - the first retained total persistence slice is now in place:
    - shared retained-value storage exists
    - it uses double-buffered `LittleFS` slots with valid-slot restore
    - first client is `totalizer`
    - totalizer policy now supports:
      - `save_every_delta`
      - `save_every_ms`
      - immediate persist on reset
  - a second non-sequence recipe path is now also started under `Modules`:
    - generic `Циклический выход`
    - not compressor-specific
    - covers:
      - plain cyclic timer
      - cycle gated by enable signal
      - cycle gated by menu/auto-enable
      - optional manual hold
      - optional manual toggle/event
    - it materializes into real runtime primitives:
      - `timer`
      - optional `logic_gate`
      - optional `latch`
  - timer direction is now clarified:
    - do not rewrite timer runtime from scratch
    - keep timer as a primitive
    - improve its user-facing semantics and display exposure
    - service/display should rely on:
      - `active`
      - `running`
      - `phase_remaining`
      - `phase_state`
    - `phase_state` is now published explicitly by timer runtime with:
      - `inactive`
      - `on_phase`
      - `off_phase`
    - the extra timer state no longer requires rolling back signal coverage:
      - `SignalRegistry` storage now uses dynamic allocation instead of oversized static `.bss`
    - expected UX:
      - if output is ON: show time until it turns OFF
      - if output is OFF but timer cycle is running: show time until next ON
      - if timer is inactive: hide time
  - after that:
    - `PWM`
  - current UI maintenance note:
    - `Modules` demo seeding crash is fixed
    - shell bootstrap no longer crashes if block-editor modal nodes are temporarily missing
    - base block-visibility logic now tolerates incomplete modal DOM during language/help refresh
    - the complete `blockModal` fragment is now restored
    - next focused UI repair should be a cleanup/usability pass of the restored block editor instead of more crash containment
- the future return path to `Modules / Templates` is now constrained by one rule:
  - module creation must instantiate real engine objects
  - module-first UX must therefore include:
    - setup wizard
    - auto-created blocks/signals/sequences
    - generated-object ownership metadata
    - validation before create
    - autofill/defaulting rules vs required user inputs
    - explicit display/service exposure rules for generated outputs
- one more architectural clarification is now fixed:
  - `modules` are not a second runtime layer
  - `flow lines -> modules -> blocks -> signals` is an authoring graph
  - the compiled runtime graph must stay flat:
    - signals
    - blocks
    - sequences
    - alarms
    - outputs
  - scheduler work should therefore happen once per runtime unit, not recursively through module nesting
- sequence is also no longer the default answer for every task:
  - use `sequence` for phases, transitions, waiting, timeout and fault-oriented orchestration
  - use block-based or hybrid modules for simpler continuous/discrete logic
  - examples:
    - cyclic purge
    - on/off threshold control
    - manual override
    - pulse/rate extraction
- current live UI maintenance rule:
  - keep `index.html` as shell
  - move heavy DOM into fragments
  - do not grow the monolithic HTML again while the automation UI keeps expanding

Immediate architecture clarification now fixed:

- future `flow lines` should be understood as:
  - visible `modules + sequences`
- modules should instantiate:
  - generated `blocks`
  - generated or bound `signals`
  - optional owned `sequence`
  - optional alarms
- lower-layer primitives remain the real engine source of truth
- module setup therefore needs:
  - a guided setup wizard
  - generated-object preview
  - traceability
  - validation
  - edit/regeneration review
  - declared `Display / Service` exposures for selected generated values/statuses
- autogeneration discipline should follow a fixed matrix:
  - `always_create`
  - `create_if_missing`
  - `suggest_create`
  - `never_autocreate`
- practical rule:
  - `bind before create`
  - `publish only what is useful`
- when returning to module-first UX after `PWM`, the next correction pass should explicitly cover:
  - authoring graph vs compiled runtime graph
  - simple function module vs sequence-based module
  - first guided setup flow for a non-sequence example such as cyclic purge

## Delivery Guardrails

These rules exist to prevent jumping too far ahead of the current stage.

### 1. Stage Gates

Each major stage should have a practical gate before the next stage expands.

That means:

- config is stable enough
- runtime behavior is real, not placeholder-only
- commissioning UX exists at a useful minimum
- memory budgets still fit the platform

### 2. Config Versioning

The platform should not grow its config model without a versioning and migration path.

Required direction:

- explicit config schema version
- migration strategy for changed keys and structures
- avoid silent breakage of old configs

Current implementation note:

- first skeleton is already in place:
  - top-level `config_version`
  - supported-version reporting in runtime
  - save path rewriting current version

### 3. External Resource Rule

All future external connectivity should reuse the same model:

- local resource
- external resource
- channel binding
- signal publishing

This prevents separate architectures for:

- local GPIO
- external ADC/DAC
- Modbus
- future bus devices

### 4. Commissioning UX Gate

A technical feature is not considered stage-ready until it has a minimum commissioning path.

Examples:

- usable editor
- live preview where needed
- clear status/quality reporting
- enough help to avoid common setup mistakes

### 5. Resource Budget Guardrail

Every stage should respect ESP32 limits.

Track at minimum:

- flash budget
- RAM budget
- channel count
- block count
- display widget/screen count

Working rule:

- keep the current budget snapshot in `docs/implementation-status.md`
- update that snapshot after each meaningful stage advance
- do not call a stage healthy unless the new memory numbers are written down
- when flash becomes tight, prefer compile-time feature reduction before redesigning the platform

### 6. Final Stabilization And Review

The current agreed execution style prioritizes functional growth first and a larger stabilization pass later.

That later pass should cover:

- UI review
- regression review
- config compatibility review
- memory review
- cross-feature integration review

### 6a. Compile-Time Feature Flags

The platform should not assume one universal always-linked binary forever.

Required direction:

- optional subsystem flags
- avoid linking features a target does not need
- keep one full profile and at least one lighter profile

Priority candidates:

- `LoRa`
- `OLED`
- `Comms`
- `Modbus`

Current implementation note:

- first flag skeleton is already in place:
  - `FEATURE_LORA`
  - `FEATURE_OLED`
  - `FEATURE_COMMS`
  - `FEATURE_MODBUS`
- current build profiles:
  - `env:esp32dev`
  - `env:esp32dev_minimal`

### 7. Event And History Direction

Before deep alarm and sequence UX, the platform should gain a lightweight event/history layer.

Minimum direction:

- recent event buffer
- event types for:
  - alarm changes
  - sequence transitions
  - communication loss/recovery

This should stay lightweight at first, but it must exist before the higher layers depend on it.

### 8. Text And State Presentation

Before deeper alarm/sequence/display growth, the platform should support stable user-facing text/state sources.

This avoids:

- one-off text hacks
- duplicated status naming across UI, display and runtime

## Product Positioning

The target product should be:

- more flexible than a dedicated PID controller such as Omron E5CC
- simpler and cheaper to deploy than a Siemens/WAGO-style PLC stack
- more industrial and safety-oriented than ESPHome-style automation
- suitable for marine auxiliary automation such as boilers, incinerators, pump/tank subsystems, signal conditioning, and protocol gateways
- able to supervise, shadow, or replace selected failed functional subsystems when hardware ownership allows it

## Platform Boundaries

This roadmap assumes:

- ESP32 is sufficient for V1 and most medium-complexity marine control tasks
- the product does not require a very heavy HMI
- the product does not require deep local analytics
- the product does not require large historical storage
- the product does not require many complex protocols running at once

Current execution focus:

- main reference target is currently `LilyGO T3`
- optional subsystems may later be compiled per-product/profile instead of always being linked into one binary
- `ESP32-C3` is retained as a compatible platform/satellite target

## Stage 0: Architecture Foundation

Goal:

- define a stable system model before feature growth

Deliverables:

- chip template model
- board template model
- hardware resource model
- channel model
- block model
- sequence model
- signal quality model
- safety classes for resources

Done when:

- all future features fit into the common model without hardcoded exceptions

## Stage 1: Stable Core

Goal:

- make the runtime stable and predictable

Deliverables:

- config loader and validator
- template library
- resource manager
- channel registry
- hardware availability map
- boot validation
- diagnostics basics
- watchdog strategy

Done when:

- the controller boots with validated config
- hardware/channel mismatches are visible
- template-driven setup works without manual code edits

## Stage 2: Industrial I/O

Goal:

- provide real industrial signal handling

Deliverables:

- DI
- DO
- AI
- AO
- Counter
- Frequency
- PWM
- debounce
- hysteresis
- filtering
- scaling
- clamping
- calibration
- guided calibration
- commissioning calibration wizards
- support for 0-10 V, 4-20 mA, 0-20 mA through suitable front-ends
- external ADC and DAC expansion support

Done when:

- analog and digital signals can be conditioned and routed entirely from config/UI

Current recommended focus:

- `Analog I/O v1` should be completed before deep protocol work
- analog channels should expose engineering semantics first:
  - electrical profile
  - engineering range
  - units
  - filtering
  - calibration
  - quality
- after base analog engineering support, the next calibration layer should be:
  - guided calibration
  - known-reference calibration
  - known-volume/domain-specific calibration
  - save/apply/rollback of calibration results
- `Alarm` work should wait until:
  - analog conditioning is stable
  - calibration entry paths exist
  - basic commissioning UX is in place
- deep protocol work should begin only from the shared `Communications Foundation v1` slice:
  - bus
  - device
  - external resource
  - polling/runtime state
  - quality/timestamp semantics
- after the communications foundation, the agreed staged order is:
  1. `External Analog UX Pack v1`
  2. `Device Template Pattern v1`
  3. `External DAC v1`
  4. `Modbus RTU v1`

This means:

- `Modbus RTU v1` is explicitly after the first external DAC stage
- the platform should first prove a clean reusable device-template path for both external input and external output
- the currently approved long-run order beyond that is:
  - `Alarm v1`
  - `Alarm UX / Service Pack v1`
  - `Logic Helper Pack v1`
  - `Sequence Foundation v1`
  - `Sequence Engine v1`

## Stage 3: Logic Blocks

Goal:

- solve most tasks through reusable blocks instead of task-specific firmware

Deliverables:

- PID
- Timer
- Comparator
- Window comparator
- Latch
- Logic gates
- Edge / one-shot trigger
- Hysteresis / deadband
- Selector
- Permissive / interlock helpers
- Scheduler / calendar block
- Ramp/Soak
- Analog mapper
- Alarm
- Flow/Totalizer
- Protocol gateway block

Scenario-enabling backlog that should not be forgotten:

- `AND / OR / NOT / XOR` as simple reusable logic blocks
- reusable front/edge pulse generation for event-style transitions
- deadband/hysteresis as a clear conditioning building block
- time-window / schedule gating for day/night or service routines
- permissive / inhibit / interlock helpers before deep sequence work
- mode / authority helper before deep sequence work:
  - local
  - remote
  - auto
  - manual
  - service
- heartbeat / freshness / comm-loss helper before deep sequence work, especially for external devices and satellites

Working rule for the current major delivery pack:

- complete `Logic Helper Pack v1` before beginning `Sequence Foundation v1`
- do not jump directly from alarms into sequences without the helper layer
- once sequence runtime exists, continue adding only the helper slices that directly improve sequence authoring:
  - `permissive / inhibit / interlock`
- after that, move to real reusable sequence scenarios instead of endlessly widening the helper catalog

Done when:

- common control tasks are built by composing blocks

## Stage 4: Sequence Engine

Goal:

- support complex mechanisms through explicit states and transitions

Architecture rule:

- sequences should not primarily be implemented as autogenerated piles of ordinary `timer`, `latch`, and helper blocks
- sequences should be first-class runtime objects that:
  - consume existing signals
  - drive outputs or command signals
  - publish their own dependent state/status signals automatically

This keeps sequence editing scenario-first and avoids exposing internal orchestration spaghetti to the user.

Deliverables:

- state machine runtime
- state actions
- timers per state
- permissives
- trips
- lockout
- restart rules
- manual/service transitions
- sequence-owned dependent signals such as:
  - current step
  - step active flags
  - transition readiness
  - running / done / fault
  - per-step timing / waiting reason

Target use cases:

- boiler auxiliary controller
- incinerator controller
- pump/tank sequence controller

Done when:

- complex mechanisms are modeled as sequences instead of ad hoc logic chains
- sequence editing remains the source of truth, and internal sequence status does not require manual recreation through ordinary blocks

## Stage 5: Safety Layer

Goal:

- separate normal control from protection logic

Deliverables:

- interlocks
- trips
- latched alarms
- safe-state policy
- startup checks
- comm-loss behavior
- sensor plausibility checks
- manual override policy
- local/remote/auto/manual/service modes

Done when:

- failures move the system into a defined and reviewable state

## Stage 6: Communications

Goal:

- make the controller a system node, not only a local I/O device

Deliverables:

- RS485 / Modbus RTU
- Modbus TCP
- RS232
- RS422
- CAN/TWAI base support
- bus manager
- external device templates
- signal import/export via protocols

Done when:

- channels can use local or bus-based sources and sinks

Current recommended focus:

- build a shared communications foundation before expanding protocols:
  - bus/port model
  - device model
  - poll scheduler
  - signal import/export mapping
  - communication quality/status
- first protocol target should be `Modbus RTU`
- `I2C` should follow through the same shared transport/device model
- external multi-channel `ADC/DAC` devices should enter through the same bus/device/resource architecture rather than as special-case analog hacks
- the first external analog device targets should be:
  - one practical multi-channel ADC
  - one practical multi-channel DAC

## Near-Term Delivery Order

To reduce architecture thrash, the current recommended order is:

1. `Analog I/O v1`
2. `Guided Calibration v1`
3. `Commissioning polish for Analog`
4. `Communications Foundation v1`
5. `External ADC/DAC v1`
6. `Modbus RTU v1`
7. `Alarm v1`

## Stage 7: Service Web UI

Goal:

- turn the Web UI into a commissioning and service tool

Deliverables:

- Overview
- Hardware
- Signals
- Blocks
- Sequences
- Diagnostics
- Trends
- Service
- Network
- guided commissioning and calibration tools

Done when:

- a technician can inspect, tune, force, diagnose, and restore the controller from the browser

Calibration note:

- simple calibration math belongs to `Stage 2`
- human-guided calibration wizards belong to `Stage 7`
- this includes flowmeter-style and instrument-style guided setup flows

## Stage 8: Local HMI

Goal:

- provide configurable local interaction without a heavy graphical stack

Deliverables:

- dashboard screens
- configurable widgets
- buttons with debounce
- resistive keyboard support
- encoder-ready input model
- screen templates
- signal-bound display widgets
- display formatting layer
- screen navigation model
- display dependency tracking

Done when:

- the local display shows key values and accepts local control inputs

Architecture note:

- display must be built as a view over existing `signals`
- display must not invent a parallel value model
- see `docs/display-model-v1.md`

## Stage 9: Logs and Serviceability

Goal:

- improve trust, maintenance, and troubleshooting

Deliverables:

- event log
- alarm log

## Cross-Cutting Product Direction: Application Templates

Goal:

- make domain-specific controllers buildable from the common platform without task-specific firmware

Principle:

- the product should be able to assemble complete applications from:
  - resources
  - signals
  - blocks
  - screens
  - presets
  - service pages

First target application templates:

- Flowmeter
- Temperature controller
- Signal conditioner
- Boiler auxiliary controller
- Incinerator controller

Flowmeter template should eventually include:

- signal acquisition and pulse validation
- calibration by liters-per-pulse or known volume
- fuel presets and density compensation
- total and daily counters
- live diagnostics and sensor tuning
- logs / CSV export
- display-ready widgets based on existing signals

Reference rule learned from local flowmeter projects:

- density compensation must reuse the existing local reference model from:
  - `flowmetr_v3`
  - `flowmeter_web2`
- the approved reference is the piecewise `rho15 -> rhoT(temp)` model already used there
- do not replace it with a simplified linear `alpha` formula
- persistent totals should prefer pulse-derived counters with periodic persistence, instead of freely drifting float totals

Product implications learned from flowmeter reference projects:

- commissioning UI must combine live diagnostics and parameter editing on the same page
- domain help and operator-facing explanations should be embedded directly in the UI
- domain values such as `l/min`, `daily total`, `density @ T`, and `quality` should be ordinary signals, not hardcoded one-off values
- the platform should support domain-focused screens such as `Dashboard`, `Sensor Setup`, `Calibration`, `Fuel`, `Logs`, and `Service`

Done when:

- a new domain device can be assembled as a template/configuration on top of the common controller runtime
- config backup/restore
- config diff
- retained values
- calibration storage
- diagnostic snapshots

Done when:

- field issues can be investigated after the event, not only live

## Stage 10: Productization

Goal:

- turn the platform into a repeatable product family

Deliverables:

- reusable chip template library
- reusable board template library
- application templates
- multi-target build profiles
- optional feature builds
- shared main/satellite repository layout
- versioned config format
- OTA updates
- user roles
- deployment workflow

Done when:

- one firmware image can be configured into multiple product variants and applications

## Recommended Development Order

1. Stable Core
2. Industrial I/O
3. Logic Blocks
4. Sequence Engine
5. Safety Layer
6. Communications
7. Service Web UI
8. Local HMI
9. Logs and Serviceability
10. Productization

## Immediate Active Track

Current short-term delivery order is now:

1. `Test 1: Button -> Timer -> Relay`
2. `Test 2: Flowmeter`
3. `Test 3: Boiler`

These are validation projects, not product-specific end goals.

### Test 1 Current Direction

The approved path for `Test 1` is now:

- user enters through `Modules`, not `Blocks`
- demo workspace starts from a simple scenario
- wizard must support:
  - bind existing resources
  - create missing local I/O
  - preview generated internals
  - materialize generated internals into real runtime blocks

Already implemented for `Test 1`:

- existing signal/channel binding inside the wizard
- create missing input `DI` channel from the wizard
- create missing output `DO` channel from the wizard
- generated internals preview
- first materialize path:
  - optional `button`
  - optional `latch`
  - one real `timer`

Next `Test 1` follow-up after user validation:

- tighten `bind-before-create` UX further
- expose materialized block ownership more clearly
- connect timer display/service semantics directly to the simple scenario path

Validation rule reinforced for demo workspaces:

- demos must not ship with fake placeholder bindings that instantly make modules `invalid`
- optional fields should start empty
- user-added links and bindings should be the only source of real validation errors

Blank-project entry rule reinforced:

- an empty workspace must expose a visible `quick start` path
- first useful modules should be visible without family-filter discovery
- for now that means at least:
  - `Дискретная точка / Источник`
  - `Таймер`
  - `Дискретная точка / Команда`
  - `Циклический выход`

Unified I/O model rule reinforced:

- input and output should not be treated as two unrelated controller object families
- the underlying platform object remains one `I/O point / channel`
- scenario UI may still show different roles:
  - source
  - logic
  - command / actuator

### Flowmeter Priority Shift

`Flowmeter Pattern Pack v1` remains important, but it is now intentionally sequenced after the first complete simple-project authoring path.

Reason:

- the platform first needs one clean end-to-end small-project workflow
- then the stronger signal-processing workflow can be layered on top

## Initial Target Applications

- Temperature Controller
- Boiler Controller
- Incinerator Controller
- Signal Conditioner
- Tank and Pump Controller
- Remote I/O and Modbus Gateway

## Future Hardware And Firmware Scaling

Approved long-term direction:

- one repository
- one shared platform core
- multiple firmware targets later
- optional compile-time feature profiles
- future satellite controllers for heavy or real-time tasks

Approved role split:

- current main target: `LilyGO T3`
- compatibility ESP satellite/dev target: `ESP32-C3`
- future simple custom satellite direction: `RP2040` or `STM32G0/C0`
- future motion satellite direction: `STM32G4`

Current priority rule:

- finish current main-controller functionality first
- do current work on `LilyGO T3`
- keep `ESP32-C3` as the current compatibility/satellite ESP option
- if memory gets tight, disable optional subsystems at compile time
- defer full satellite rollout and dedicated test-bench hardware until after the current functional scope and a full UI review

## Mutable Storage Risk Reduction

Completed:

- editor project models moved to NVS / `Preferences` as primary storage
- mutable runtime/project config moved to NVS / `Preferences` as primary storage
- legacy `LittleFS` files remain only as migration fallback

What this changes:

- `uploadfs` should no longer wipe:
  - editor project models
  - live runtime/project config

Remaining storage rule:

- `LittleFS` is now for uploaded static Web UI assets and selected runtime files that are intentionally filesystem-based
- mutable project state should prefer controller-side NVS unless there is a strong reason not to

## Test 1 Next Rule

Locked direction:

- `Test 1` must continue moving toward step-by-step editor-driven runtime ownership
- generated runtime should belong to the editor-node that created it
- this owner contract should become the basis for:
  - node-level materialize
  - node-level delete
  - future node delete -> generated runtime cleanup

First live slice now implemented:

- `Input Behavior` can now materialize its own runtime node directly from the editor
- `logic_input_behavior_runtime` is tracked as generated by owner `logic_input_behavior`
- the editor can also delete that owned runtime again

Latest concrete shift inside `Test 1`:

- the old `Enable gate -> timer_enable` wording is no longer the target model
- `Test 1` timer semantics are now being aligned to:
  - `run_request`
  - `permissive`
  - `standby`
- in the current implementation this is bridged safely through helper runtime blocks
  - so editor semantics can improve now
  - without forcing an immediate timer-primitive rewrite

Immediate next refinement:

- extend the same owner-bound lifecycle to:
  - `Run latch`
  - `Permissive`
  - `Timer`
- keep full `Materialize Test 1` as the “assemble whole flow” action

Latest lifecycle progress:

- `Run latch` now also has node-level runtime controls in the editor
- `Permissive` now also has node-level runtime controls in the editor
- `Timer` now also has node-level runtime controls in the editor
- the timer node currently materializes as an owned runtime pair:
  - helper gate
  - timer primitive
- this keeps the editor truthful to the higher-level PLC contract while the primitive runtime stays stable
- `Run latch`, `Permissive` and `Timer` now also expose real editable source fields in the inspector
- next visual refinement should make those configured sources more visible directly on the canvas/wires,
  so the graph and inspector do not drift apart
- this refinement is now partially started:
  - configured source fields already drive:
    - validation
    - node trace
    - visual edge construction
    - materialize
  - the next requirement is to surface those selected sources directly on input ports and in shorter wire labels
  - the canvas should explain the flow before the inspector is opened

## Test 1 V1 Boundary

Locked scope for the first truly finished `Test 1`:

- `Signal Source`
  - raw discrete source only
  - existing `signal` or create `signal` from `channel`
- `Input Behavior`
  - only:
    - `click`
    - `double_click`
    - `hold`
- `Run latch`
  - `click -> set`
  - `double_click -> reset`
- `Cyclic Timer`
  - not a full sequence
  - but already more PLC-like than plain `enable -> active`
  - v1 target contract:
    - `run_request`
    - `permissive`
    - `stop_policy`
    - outputs:
      - `active`
      - `standby`
      - `phase_state`
      - `phase_remaining`
- `Command`
  - simple command path to the target channel

What is intentionally excluded until `Test 1` is fully validated:

- no `release`
- no `toggle_state`
- no `repeat`
- no `triple_click`
- no full `stop/reset/inhibit/fault` orchestration inside the timer
- no `auto/manual/local/remote` authority stack inside `Test 1`
- no boiler-specific semantics

Reason for this boundary:

- `Test 1` must become a small finished reference
- it must validate:
  - source
  - behavior extraction
  - latch
  - permissive logic
  - cyclic timer
  - command
- but it must not expand into a pseudo-boiler project before `Flowmeter` and `Boiler` get their own dedicated passes

Current visual debt inside that same boundary:

- `Test 1` cards are still too large compared with the approved reference direction
- further visual work should prioritize:
  - smaller node cards
  - stronger orthogonal port-to-port wiring
  - less card/panel feeling
  - more true visual-editor feeling
