# Implementation Status

## Purpose

This file tracks the real implementation state of the project.

It exists so that important decisions, finished work, active work, and agreed next steps do not get lost between long sessions or context compression.

Use this file together with:

- `docs/product-roadmap.md` for long-term product stages
- `docs/system-architecture-v1.md` for architecture rules
- `docs/ui-architecture-v1.md` for Web UI structure and future-safe UI rules
- `docs/block-editor-ux-v1.md` for the agreed user-facing behavior of the block editor
- `docs/display-model-v1.md` for the agreed future model of local screens and widgets
- `docs/display-implementation-spec-v1.md` for the agreed implementation and UI scope of the display system
- `docs/web-ui-lfs-migration-plan-v1.md` for the agreed flash-reduction strategy of moving the Web UI into `LittleFS`
- `docs/analog-io-and-comms-roadmap-v1.md` for the agreed implementation order of Analog I/O and communication buses
- `docs/analog-io-implementation-spec-v1.md` for the staged implementation scope of Analog I/O
- `docs/external-adc-dac-roadmap-v1.md` for the agreed entry path of external multi-channel analog devices
- `docs/comms-foundation-spec-v1.md` for the shared `bus -> device -> external resource` model
- `docs/major-update-roadmap-to-sequence-v1.md` for the approved long-run execution path up to the first usable sequence engine
- `docs/platform-scaling-strategy-v1.md` for the agreed multi-target/platform-scaling direction
- `docs/test-bench-spec-v1.md` for the future main-controller bench direction
- `docs/full-ui-review-plan-v1.md` for the agreed structured UI review pass
- `docs/visual-editor-strategy-v1.md` for the agreed future visual-editor direction
- `docs/functional-module-model-v1.md` for the approved module-first layer above the current engine
- `docs/universal-control-pattern-library-v1.md` for the approved pattern-first direction above individual mechanisms
- `docs/universal-block-base-v1.md` for the approved reusable primitive block base under all future modules
- `docs/competitor-analysis-universal-block-base-v1.md` for the first official comparison of that primitive base against PLC/FBD and ESPHome-style ecosystems
- `docs/pilot-reference-scope-v1.md` for the approved role of `boiler + flowmeter` as the two current functional stress-test references
- `docs/custom-module-authoring-v1.md` for the approved `Compose -> Export Interface -> Publish -> Reuse` path
- `docs/flowmeter-pattern-pack-v1.md` for the first non-boiler pattern-pack decomposition
- `docs/pattern-first-ui-reorganization-v1.md` for the approved UI regrouping into hardware vs automation vs service
- `docs/russian-pattern-template-registry-v1.md` for the first Russian-first user-facing registry for core patterns and templates
- `docs/pulse-rate-extraction-pattern-v1.md` for the shared pulse/rate extraction pattern that should be reused by flowmeter, RPM and similar tasks
- `docs/boiler-pilot-module-map-v1.md` for the first module-first pilot decomposition of a real mechanism
- `docs/module-first-ui-spec-v1.md` and `docs/boiler-module-first-ui-v1.md` for the first mechanism-level UI target above the current object-first screens
- `docs/module-registry-spec-v1.md` for the registry model that should drive future module-first authoring
- `docs/module-runtime-contract-v1.md` for the approved non-blocking runtime contract for all future functional modules
- `docs/sequence-contract-v1.md` for the approved first-class non-blocking sequence contract above the shared engine
- `docs/module-instantiation-and-setup-wizard-v1.md` for the approved rule that modules must instantiate real blocks/signals/sequences through a guided setup flow
- `docs/scenario-first-authoring-model-v1.md` for the approved scenario-first product authoring direction above modules and generated internals
- `docs/editor-first-product-direction-v1.md` for the approved product correction from object-first UI toward state/flow editor-first authoring
- `docs/json-project-model-v2.md` for the first explicit editor-side project model that should become compiler input
- `docs/scenario-first-authoring-vision-v1.html` for the visual target of that scenario-first model
- `docs/scenario-first-ui-design-v1.html` for the updated standalone UI mockup of the target scenario-first workspace
- `docs/scenario-authority-layout-boiler-v1.html` for the refined visual layout where control context is separated from sources, policy, logic and actuators
- `docs/scenario-simple-workspace-v1.html` for the simplified first-screen workspace that should replace the more overloaded concept views as the main UI target
- `docs/boiler-flow-view-example-v1.html` for the first concrete boiler-based `flow view v1` visual target
- `docs/logic-ownership-matrix-v1.md` for the approved ownership split between Channels, Signals, Blocks, Sequences, Modules and Composite mechanisms
- `docs/boiler-abstraction-map-example-v1.html` for the first concrete boiler example showing how the abstraction stack maps into Flow View
- the block/signal/runtime specs for detailed design

## Status Snapshot

Date:

- 2026-03-23

Overall state:

- architecture direction is stable
- stable core is in strong progress
- logic blocks are no longer conceptual only; they are already implemented in the runtime
- UX is now the main limiting factor, not the basic block architecture
- runtime primitives for the flowmeter branch are now materially present:
  - `counter`
  - `totalizer`
  - `rate_estimator`
  - `window_aggregator`
  - `signal_extractor`
- retained persistence for `totalizer` is now implemented with double-buffered restore
- the current main UI risk is now the authoring path of `Blocks`, not the runtime itself
- a newly confirmed system risk now also exists:
  - mutable live config still lives in the same `LittleFS` image as the uploaded Web UI
  - `pio run -t uploadfs` can therefore overwrite `/config.json`
  - this now needs a dedicated storage separation pass after block-editor stabilization
- the next concept-level correction is now explicit:
  - project authoring should move toward:
    - `Project -> Main -> Modules -> Child Sequences -> Generated Internals`
  - `Main` should be the default root scenario of every project
  - users should be able to start simple in `Main` and later extract parts into child sequences without restructuring from zero
- the first-screen UX target is now also clarified:
  - earlier concept mockups proved the direction but remained too overloaded
  - the first real scenario workspace should instead be:
    - left `Project`
    - center selected scenario
    - right `Inspector`
  - inside the selected scenario the first calm layout should be:
    - `Источники`
    - `Логика`
    - `Выходы`
  - `ON/OFF`, `AUTO/MANUAL`, `LOCAL/REMOTE` should stay as compact top context chips
  - generated internals should move behind `Advanced`, not stay on the first screen
- rollback decision is now explicit:
  - runtime work should be kept
  - authoring/UI direction should pivot
  - this is a controlled pivot, not a destructive rollback

Latest confirmed fix:

- block editing/saving in the Web UI was failing for extended block types because the restored `blockModal` could open blocks whose type option was not guaranteed to exist in the `blockType` select at edit time
- this caused the editor to lose the real block type and route save through the wrong save-path
- the current fix now force-seeds all registry block types into `blockType` and `blockFilter` before `reset/edit`, so edited blocks keep their real type and save through the correct handler again
- `/blocks` used to expose only runtime-loaded blocks from `gConfig`
- this meant a block could be saved into `/config.json`, fail runtime apply, and then disappear from the list as if it had never been created
- the current fix now merges raw config blocks into `/blocks` as `config_only` items when runtime did not load them
- result:
  - broken blocks stay visible
  - they can still be edited or deleted
  - missing dependencies no longer appear to vanish just because runtime rejected the block once
- `blockModal` was also missing `blockModeHint` after the fragment split; that DOM contract is now restored

Latest implemented UI slice:

- the first live `Test 1` scenario-first slice is now visible in `Modules`
- the first editor-first live slice is now visible in `Автоматика -> Редактор`
- this is the first direct product pivot after comparing the project to the new reference mockup
- the new `Редактор` screen is now the first live step toward:
  - `Project`
  - `State / Flow Editor`
  - `JSON Project Model`
  - `Compiler`
  - `Existing Runtime`
- the current live editor slice includes:
  - left `Project / Library`
  - center `State mode / Flow mode`
  - right `Inspector / Explain`
  - three reference demos:
    - `Test 1: Button -> Timer -> Relay`
    - `Test 2: Flowmeter`
    - `Test 3: Boiler`
- this editor is still a product-direction slice, not the final compiler-backed implementation
- it intentionally does not replace existing `Channels / Signals / Blocks / Sequences`
- instead it establishes the new main UX layer those lower tools must move under
- the editor visual language has now moved one step closer to the reference:
  - less generic panel/card feel
  - its own compact workspace top bar
  - clearer separation between:
    - left project/library sidebar
    - center stage
    - right inspector
  - calmer dedicated editor surfaces instead of reusing the old section-card feeling everywhere
- there is a dedicated demo entry:
  - `Demo: Button + Timer + Relay`
- three small first-test modules are now surfaced in the module catalog:
  - `Дискретная точка / Источник`
  - `Таймер`
  - `Дискретная точка / Команда`
- the operation view for that demo now switches to a calmer first-screen layout:
  - left project stub with root `Main`
  - center `Источники | Логика | Команды / Исполнение`
  - existing inspector on the right
- this is no longer only a static UI slice:
  - the inspector now includes the first dedicated setup wizard for:
    - source signal from an I/O point
    - timer profile and times
    - command target channel
    - optional feedback
- the wizard also includes:
  - `Подставить demo значения`
  - quick jumps to `Signals` and `Channels`
  - a first generated-internals preview
- the current wording and flow now explicitly treat controller inputs and outputs as one underlying I/O-point model:
  - the same `channel` layer lives underneath
  - the scenario screen only changes the role:
    - source
    - logic
    - command / actuator
- the same `Test 1` guided path is now no longer tied only to the preset demo:
  - if the current workspace contains the small trio:
    - `button_input`
    - `timer_primitive`
    - `discrete_output`
  - the calm `Main` workspace view and the same setup wizard are shown there too
  - this is the first live step from demo-only flow toward blank-project authoring
- the blank-project quick start is now also more explicit:
  - cards are action cards, not passive descriptions
  - they stay visible while the user is still assembling the basic trio
  - adding a module now also writes a short status message in the module area
- the top hero/header has now been compacted:
  - smaller title
  - shorter subtitle
  - tighter summary cards
  - reduced vertical gaps before the real work area
- the mode description is now moved into the controller description area itself
  - this removes the extra full-width banner under the header
  - the top shell is now more mobile-first and less poster-like
- the shell header has now been tightened one more step for phone-first viewing:
  - language selector is no longer a large form card
  - it is now a compact `RU / EN` toggle in the top line
  - the technical summary is no longer a second large column block
  - the header is now one compact stack:
    - title + `RU / EN`
    - compact mode select
    - one horizontal meta row with:
        - mode title above its description
      - compact 4-row status block with Wi-Fi/IP/Chip/Board and no extra heading text
  - the whole status block still acts as one quick-access target and opens `Сеть`
  - `Аппаратная часть` and `Сервис` no longer collapse to empty in operator mode:
    - `Сеть` stays available under hardware
    - `Инспектор` stays available under service
  - this removes the earlier “half-screen hero” behavior on phones
- the shell navigation is now more compact:
  - first-level sections stay as top tabs:
    - `Обзор`
    - `Аппаратная часть`
    - `Автоматика`
    - `Сервис`
  - second-level navigation is visible again as a full button row for faster tapping
  - subsection buttons are now smaller and denser than before
  - a dedicated readability pass was applied to the second row:
    - quieter container
    - higher text contrast
    - softer active state
    - clearer hierarchy against the first row
  - the visible shell navigation is now explicitly stacked as:
    - first row: first-level sections
    - second row: compact subsection buttons for the active section
- the shell visual language is now moving to a darker Android-like theme:
  - dark background
  - dark cards/panels
  - green accent for active controls
  - tighter, denser mobile-first shell
- this is still not the full bind-before-create flow yet
- but it is the first live guided authoring step for `Test 1`

Roadmap position estimate:

- Stage 0 Architecture Foundation: 90-95%
- Stage 1 Stable Core: 70-80%
- Stage 2 Industrial I/O: 25-35%
- Stage 3 Logic Blocks: 20-30%

Current agreed strategic direction:

- near-term functional order is now:
  1. stabilize `Blocks` authoring/save path
  2. separate mutable live config from uploaded Web UI storage
  3. finish `Flowmeter Pattern Pack v1` as a real guided setup flow
  4. lift flowmeter service/display outputs into a readable operator/service path
  5. build the first scenario-first entry:
     - `Project Explorer`
     - root `Main`
     - smaller composable modules
     - optional child sequences
     - generated internals preview
  6. then add `PWM`
- the most effective next work is no longer another broad UI reshuffle
- the most effective next work is now:
  - make the `Blocks` path reliable
  - separate mutable config from uploaded UI assets
  - then convert the current flow primitives into one usable guided authoring flow
  - then move the entry point upward from `Blocks` to `Project -> Main`

Current delivery guardrails:

- use stage gates instead of feature-hopping
- keep config changes migration-aware
- keep local and external resources under one shared model
- require minimum commissioning UX before calling a stage usable
- watch flash/RAM/channel/block budgets continuously
- for the approved long-run pack up to `Sequence Engine v1`, move phase by phase in documented order and avoid re-planning unless a real blocker appears
- on every future context compression or resume, sync first with this file and `docs/major-update-roadmap-to-sequence-v1.md`
- while moving through the long-run pack:
  - start with config migration awareness and feature flags
  - add event/history and text/state presentation before deep `Alarm` and `Sequence` UX
  - leave the broad regression review for the later final stabilization pass
- future visual editing direction is now fixed:
  - first visual layer should be a `sequence/state` editor
  - not a generic full-canvas block editor
  - not a ladder-like second runtime
  - mechanism templates should sit on top of sequence, not replace it
- a new architectural rule is now fixed above the current engine:
  - the next major user-facing abstraction should be `functional modules`
  - this layer should sit above:
    - `resources`
    - `channels`
    - `signals`
    - `blocks`
    - `alarms`
  - `sequences`
  - it should not require a rewrite of the current engine
  - it should increasingly become the preferred future authoring surface
- the current UI execution order is now explicitly:
  1. block-editor reliability
  2. config/storage safety
  3. `Project Explorer + Main`
  4. small composable module set
  5. child sequence authoring
  6. generated internals preview
- the current active short pass is:
  - stabilize authoring and prepare the scenario-first pivot
- the latest concept/UI clarification is:
  - do not use the heavier concept layouts as the direct implementation target
  - use the new simplified workspace mockup as the preferred first implementation target for:
    - `Project Explorer`
    - `Main`
    - `Sources | Logic | Outputs`
    - `Inspector`
- the latest practical implementation slice under that clarification is:
  - `Modules -> Demo: Button + Timer + Relay`
  - this now acts as the first live test-bed for:
    - root `Main`
    - smaller composable modules
    - calm first-screen workspace
    - first setup wizard behavior
- the live UI has now also entered a real regrouping pass:
  - first-level navigation is now:
    - `Обзор`
    - `Аппаратная часть`
    - `Автоматика`
    - `Сервис`
  - second-level navigation is now shown only for the active first-level section
  - `Modules` is no longer rendered as one overloaded wall:
    - semantic family chips
    - template search
    - templates open only after selecting a family or typing a query
  - `Blocks` is no longer just a noisy row of add-buttons:
    - grouped semantic quick-add sections
    - visible `coming soon` placeholders for missing base primitives
- the next functional strike order is now explicitly locked as:
  1. reliable block editing / save / reopen / delete
  2. storage separation for mutable project config
  3. finish `Test 1` guided path from demo to usable simple project flow
  4. `Flowmeter Pattern Pack v1` guided path
  5. flowmeter operator/service path
  6. scenario-first entry:
     - `Project Explorer`
     - `Main`
     - child sequences
  7. first small module set
  8. `PWM`
- one new must-not-forget product rule is now explicit:
  - future flow lines consist of `modules + sequences`
  - modules consist of generated `blocks`
  - blocks consume or publish `signals`
  - module creation must therefore instantiate real lower-layer primitives and not stop at visual cards
  - future `Display / Service` screens should consume:
    - module outputs
    - owned sequence outputs
    - selected generated block/signal values exposed by the module
- one more must-not-forget correction is now explicit:
  - `modules` are mainly authoring/ownership/interface objects
  - they must not become a second recursive runtime layer
  - the controller should execute a flat compiled runtime graph:
    - source/normalized signals
    - blocks
    - sequences
    - alarms
    - outputs
  - the visible ladder:
    - `flow line -> module -> block -> signal`
    is for authoring and traceability, not for nested scheduling
- `sequence` is now also clarified as not being the default for every function:
  - use it for phase-based orchestration
  - do not force simple cyclic/on-off/manual-override logic into sequence-first authoring
  - future module setup must therefore support:
    - block-only modules
    - sequence-based modules
    - hybrid modules
- the larger authoring concept is now also clarified:
  - users should not start from raw blocks
  - users should start from project + root `Main`
  - modules should become smaller and more composable
  - child sequences should be added only where true phase/state logic is needed
  - blocks remain an advanced/runtime layer, not the main first-touch surface

Latest implemented UI-visible changes:

- `Automation` second-level order is now closer to user intent:
  - `Модули / шаблоны`
  - `Сценарии`
  - `Аварии`
  - `Дисплей`
  - `Сигналы`
  - `Каналы`
  - `Блоки (advanced)`
- `Hardware` second-level labels are now clearer in Russian:
  - `GPIO / железо`
  - `Плата и шаблоны`
  - `Устройства / шины`
  - `Сеть`
  - `Диагностика`
- `Modules` now behaves as a scalable catalog instead of a long registry wall:
  - compact semantic chips
  - search
  - no full dump in `all` mode
  - long explanatory text stays in inspector, not in the library itself
- `Blocks` now behaves as a primitive catalog:
  - `Таймеры и события`
  - `Логика и условия`
  - `Выбор и режимы`
  - `Подготовка сигнала`
  - `Обязательная база: скоро`
- `Blocks` now surfaces the agreed missing primitive base explicitly:
  - `pwm`
  - `counter`
  - `totalizer`
  - `rate_estimator`
  - `window_aggregator`
- `index.html` is no longer the only UI container:
  - it is now a real shell
  - heavy DOM is moved to:
    - `data/fragments/app-panels.html`
    - `data/fragments/app-modals.html`
  - bootstrap now goes through:
    - `data/app-shell.js`
- `Counter` is no longer just a planned primitive:
  - runtime/backend exists
  - block editor quick-add exists
- a live shell-split regression was found and partially contained:
  - `Modules` demo seeding could crash before `moduleLinkDraft` was initialized
  - `app-init.js` could crash when a fragment omitted block-editor nodes like `blockCompareInput`
  - `setBlockTypeVisibility()` could still crash during language/help refresh when `blockType` or related modal nodes were absent
  - fixes now in place:
    - `Modules` seeding calls `ensure()` before populating draft/workspace
    - `syncDraft()` now handles empty workspaces safely
    - `app-init.js` now binds block-editor events defensively when modal nodes are missing
    - `openModal/closeModal` now no-op safely if a fragment is absent
    - base `setBlockTypeVisibility()` now returns safely when block-editor DOM is incomplete and uses safe visibility toggles
    - `data/fragments/app-modals.html` now contains a restored `blockModal` with the required DOM contract for:
      - block type/mode selection
      - scenario cards
      - signal/channel bindings
      - timing/compare fields
      - auto-button helper settings
      - advanced behavior flags
  - current known follow-up:
    - the block editor is now restored enough to work again, but still needs a focused UX cleanup pass after the shell split
  - block registry now marks it as available
  - block modal now exposes `counter` as a real type
- `Totalizer`, `Rate Estimator` and `Window Aggregator` are now also real primitives:
  - runtime/backend exists
  - config loader/save path exists
  - block editor now treats them as real types
  - block catalog no longer treats them as concept-only future placeholders
- `Signal Extraction / Tuning` is now live as a real primitive:
  - new runtime block: `signal_extractor`
  - supports:
- `Modules` now also have the first generic simple-function recipe path:
  - template: `Циклический выход`
   - it is deliberately generic, not compressor-specific
   - current runtime materialization supports:
     - plain cyclic timer
     - enable-gated cycle
     - menu/auto-enable gate
     - manual hold
     - manual toggle/event
   - generated runtime objects currently use:
     - `timer`
     - `logic_gate`
     - `latch`
  - demo workspace now exists:
    - `Demo: Cyclic Output`
- timer decision is now fixed:
  - full timer rewrite is not needed
  - current runtime already exposes enough base state for good UX:
    - `active`
    - `running`
    - `phase_remaining`
    - `phase_state`
    - `remaining`
  - the next improvement should be semantic/UI-level, not runtime replacement:
    - ON -> show time until OFF
    - OFF but cycle running -> show time until next ON
    - inactive -> do not show countdown
  - timer runtime now also publishes an explicit phase signal for service/display:
    - `inactive`
    - `on_phase`
    - `off_phase`
  - this means a single display row can now be assembled from:
    - actuator status
    - `timer.*.phase_state`
    - `timer.*.phase_remaining`
  - the larger timer signal set no longer breaks linking:
    - `SignalRegistry` signal storage is now allocated dynamically
    - this removed the `.dram0.bss` overflow without rolling back timer semantics
  - `digital_direct`
  - `analog_threshold`
  - `analog_diff_pair`
  - publishes:
    - binary state output
    - debug analog value via `*_value`
  - quality input can mark the extraction result as stale/fault without inventing a new state
- `Pulse / Rate Extractor` now has the first real bridge from module idea to runtime:
  - in `Modules`, the template can now materialize a runtime pack
  - this creates or updates real blocks for:
    - extraction
    - counter
    - rate estimation
    - totalizer
    - rolling window
  - the same template now covers both:
    - `Flowmeter`
    - `Fan RPM`
  - the implementation is still intentionally narrow:
    - it seeds the runtime chain
    - it does not yet replace the future full module setup wizard
- retained runtime totals now have a first real persistence layer:
  - new shared runtime store:
    - `src/runtime/retained_value_store.h`
    - `src/runtime/retained_value_store.cpp`
  - storage policy is now:
    - double-buffered slot files in `LittleFS`
    - valid-slot restore by sequence/checksum
  - first client:
    - `totalizer`
  - `totalizer` can now:
    - restore retained total on boot
    - save by `save_every_delta`
    - save by `save_every_ms`
    - persist reset immediately
  - `Blocks -> Totalizer` now surfaces:
    - `retain`
    - `save every delta`
    - `save every ms`

Current functional strike state:

1. `Counter` - done
2. `Totalizer` - done
3. `Rate Estimator` - done
4. `Window Aggregator` - done
5. `Signal Extraction / Tuning` - done enough for the current stage
6. `Flowmeter Pattern Pack v1` - started through runtime-pack materialization
7. `PWM` - next

Latest verified build snapshot:

- `pio run` - `SUCCESS`
  - RAM: `30.0%` (`98464 / 327680`)
  - Flash: `88.8%` (`1163865 / 1310720`)
- `pio run -e esp32dev_minimal` - `SUCCESS`
  - RAM: `30.3%` (`99200 / 327680`)
  - Flash: `86.1%` (`1128817 / 1310720`)

Immediate next UI steps:

1. continue removing mixed English/Russian labels from live screens
2. make `Blocks` filtering and search reflect semantic grouping more directly
3. convert the first core templates and first core primitive blocks to short Russian help:
   - `Что делает`
   - `Когда использовать`
   - `Что нужно привязать`
   - `Что выдаёт`
   - `Типичные ошибки`
4. keep updating this file and `docs/product-roadmap.md` after each visible UI pass so the active direction stays explicit
5. continue the shell split by moving the most volatile UI areas into smaller fragments first:
   - `Blocks`
   - `Modules`
   - heavy modals
6. prepare the future `Modules` return path around:
   - setup wizard
   - auto-created blocks/signals
   - generated-object traceability
   - validation before instantiation
   - autofill rules vs required user inputs
7. continue the current functional line in this order:
   - finish `Flowmeter Pattern Pack v1` as a cleaner runtime/authoring flow on top of `signal_extractor`
   - then add `PWM`
8. after `PWM`, the next module-first correction pass should cover:
   - `authoring graph -> compiled runtime graph`
   - guided setup for a simple non-sequence function
   - first clean split between:
     - simple function module
     - sequence-based module
   - display/service exposure metadata

Latest short-pass implementation:

- `Blocks` now has the first explicit `Core Blocks Registry` layer in the live UI:
  - semantic chips:
    - `Все`
    - `Таймеры и события`
    - `Логика и условия`
    - `Выбор и режимы`
    - `Подготовка сигнала`
    - `Скоро`
  - grouped quick-add catalog
  - short Russian registry help for the focused primitive
  - explicit placeholders for missing agreed primitive-base blocks:
    - `PWM`
    - `Totalizer`
    - `Rate estimator`
    - `Window aggregator`
- `Web UI shell split v1` is now in place:
  - `data/index.html` keeps shell, hero and navigation
  - heavy panels and modals are injected from fragments before the rest of the app scripts load
- `Counter` has now crossed from placeholder into real implementation:
  - backend/runtime:
    - `src/modules/counter.cpp`
    - `src/modules/counter.h`
    - `src/config/config_loader.cpp`
    - `src/web/web.cpp`
    - `src/core/system.cpp`
  - live UI/editor:
    - quick-add in `Blocks`
    - real registry entry
    - `counter` type in block modal
    - save path for `input / reset_input / step / initial_value / output`

Next planned short pass after this one:

- `Core Templates Registry`
  - first 5-6 core templates
  - short Russian help
  - task-first presentation
- plus the first real functional primitive follow-up:
  - `Totalizer`
  - then `Rate Estimator`
  - then `Window Aggregator`
- and the next locked `Modules` return constraint:
  - the first live module wizard must implement:
    1. generation decision matrix
    2. generated-object preview
    3. autofill vs required-field split
    4. validation before create
    5. edit/regeneration review
- the next real functional step is now:
  - `Signal Extraction / Tuning`
  - then `Flowmeter Pattern Pack v1`
  - then `PWM`

Latest architecture clarification pass:

- the future `Modules` return path is now locked more explicitly:
  - visible `flow lines` are made from:
    - modules
    - sequences
  - modules must instantiate owned/generated:
    - blocks
    - signals
    - optional sequences
    - optional alarms
  - physical/protocol bindings should preferably become normalized signals first
  - module setup must therefore include a real wizard that:
    - auto-fills defaults
    - seeds lower-layer primitives
    - previews generated objects
    - validates required bindings and conflicts
    - marks which generated values/statuses are exposed to `Display` and `Service`
- this rule is now captured and cross-linked in:
  - `docs/module-instantiation-and-setup-wizard-v1.md`
  - `docs/module-registry-spec-v1.md`
  - `docs/module-first-ui-spec-v1.md`
  - `docs/functional-module-model-v1.md`
- the autogeneration discipline is now also fixed explicitly:
  - `always auto-create` only structural template-owned objects
  - `auto-create sometimes` only normalized signals/owned alarms when required and missing
  - `suggest create` for optional channels/public helpers/display-oriented extras
  - `never auto-create` unrelated channels, duplicate normalized signals, cross-module links, or screens
  - practical rule:
    - `bind before create`
    - `publish only what is useful`

Latest functional primitive pass:

- `Totalizer` is now implemented as a real block:
  - supports:
    - `delta`
    - `delta_abs`
    - `rate_per_second`
    - `rate_per_minute`
    - `rate_per_hour`
  - supports:
    - input
    - optional reset
    - scale
    - initial value
    - derived output signal
- `Rate Estimator` is now implemented as a real block:
  - supports:
    - `per_second`
    - `per_minute`
    - `per_hour`
  - computes engineering rate from the growth of an input counter/total signal
  - supports:
    - scale
    - smoothing alpha
    - sample window
    - derived output signal
- `Window Aggregator` is now implemented as a real block:
  - supports:
    - `average`
    - `sum`
    - `min`
    - `max`
  - supports:
    - bucket size
    - window size
    - scale
    - derived output signal
- the new runtime storage for these primitives is dynamic/configured-count based, not large fixed static arrays
  - this was required to stay inside ESP32 DRAM
- the current functional chain for pulse/rate/flow work is now real at primitive level:
  - `Counter -> Totalizer -> Rate Estimator -> Window Aggregator`
  - this unlocks the next planned pass:
    - `Signal Extraction / Tuning`
    - then `Flowmeter Pattern Pack v1`

Current memory budget snapshot:

- full build `esp32dev`:
  - RAM: about `38.0%`
  - Flash: about `87.8%`
- minimal build `esp32dev_minimal`:
  - RAM: about `37.9%`
  - Flash: about `85.2%`

Working budget rule:

- after each meaningful stage advance, write the new RAM/Flash snapshot here
- do not jump to the next big stage if the new numbers are unknown
- new features should prefer:
  - file-based UI assets in `LittleFS`
  - dynamic runtime storage over large static arrays
  - one real device template at a time
  - compile-time disabling of optional subsystems when a target build does not need them

Current hardware focus:

- current main-controller work is centered on `LilyGO T3`
- available boards known for later use:
  - `ESP32-WROOM-32`
  - `ESP32-C3 Super Mini`
  - `LilyGO T3`
- for now, `LilyGO T3` remains the active main target because it already includes the local OLED path needed for current integration work
- approved role split now is:
  - `LilyGO T3` -> current main controller
  - `ESP32-C3` -> compatible ESP satellite/dev target
  - future simple custom satellite -> `RP2040` or `STM32G0/C0`
- future motion satellite -> `STM32G4`

Scenario-oriented logic backlog that should be preserved for the later logic/sequence branch:

- `AND / OR / NOT / XOR`
- edge / one-shot trigger block
- hysteresis / deadband block
- scheduler / calendar gating block
- permissive / inhibit / interlock helpers
- mode / authority helper:
  - local
  - remote
  - auto
  - manual
  - service
- heartbeat / freshness / comm-loss helper for external devices and satellites

Reason:

- these are the missing bridge between today's reusable blocks and tomorrow's practical scenario/sequence authoring

Current working rule:

- the first helper slices needed for sequence are now in place:
  - `AND / OR / NOT / XOR`
  - `edge / one-shot`
  - `hysteresis / deadband`
  - `permissive / inhibit / interlock`
- continue helper expansion where it improves scenario authoring, but sequence runtime itself is now allowed to advance

Sequence architecture rule now explicitly fixed:

- sequence should be a first-class runtime layer
- it should not primarily auto-expand into many ordinary helper blocks
- it should auto-manage its own dependent signals instead, for example:
  - running / ready / done / fault
  - current step
  - step active flags
  - transition readiness
  - time in step
  - waiting/fault reason text or enum-style status
- channels stay explicit and physical
- sequence may target channels or command/status signals, but should not auto-create hardware channels
- future module-first authoring should use sequence/module outputs and normalized signals rather than vendor-specific device details or transport-specific assumptions

## Functional Module Direction

The newly fixed next abstraction layer is:

- `Functional Module Model v1`

This means:

- current completed work remains valid
- no major rewrite is required
- the next architectural growth should happen by composing the current engine into reusable modules

The first universal module families are now fixed as:

- `Operator IO Module`
- `Measured Value Module`
- `On/Off Control Module`
- `PID Control Module`
- `Actuator Module`
- `Protocol Interface Module`
- `Sequence Module`
- `Alarm Policy Module`
- `Composite Module`

The most important future refinements now are:

- formalize stable module interfaces
- formalize capability-based command targets
- expand authority/fallback semantics beyond simple auto/manual/service
- define a first-class PID module direction
- keep future sequence/module authoring transport-agnostic

Important clarification now fixed:

- boiler remains a pilot reference and stress-test
- boiler is not the primary product abstraction
- the primary reusable product layer should be a universal control-pattern library that also covers:
  - flowmeter packages
  - compressor automation
  - BWTS-like systems
- the first competitor-analysis pass against PLC/FBD ecosystems and ESPHome-style automation is now captured
- that pass confirms:
  - `pwm` belongs in the universal primitive base
  - `window_aggregator` remains mandatory
  - `rate_estimator` now belongs to the practical primitive base
- the current two principal validation references are now explicitly:
  - `boiler` for orchestration and protection stress-testing
  - `flowmeter` for signal-conditioning, pulse, totalization and compensation stress-testing
- the first Russian-first pattern/template registry for core groups is now fixed
- `Pulse / Rate Extraction Pattern v1` is now fixed as a shared reusable pattern:
  - not flowmeter-only
  - reusable for RPM, pulse, frequency, signal-conditioning and threshold-tuning tasks
  - BWTS-like systems

Reference:

- `docs/universal-control-pattern-library-v1.md`

Additional architecture direction now fixed:

- any reusable module must still be composed from the same universal primitive block base
- repeated project composition should be publishable as a custom module
- `Flowmeter Pattern Pack v1` is now the first strong non-boiler decomposition validating that the model scales outside the boiler example

Next analysis direction:

- repeat competitor-analysis as the universal block base expands
- verify that new primitives still stay universal enough for variable marine automation tasks

Current immediate implementation direction:

- do not expand into many new mechanism-specific examples
- instead align:
  - primitive block registry
  - pattern registry
  - module templates
  - future Russian help texts
  with the now-fixed universal base
- use `boiler + flowmeter` as the current dual validation references while doing that

Immediate practical next step:

- start mapping the first real UI-visible template groups to this Russian registry:
  - `Измеряемая величина`
  - `Условие / Порог / Окно`
  - `On/Off Контур`
  - `Исполнительный механизм`
  - `Счётчик / Totalizer`
  - `Извлечение импульсов / Скорости / Настройка`

Current UI note:

- the first visible `Modules` registry pass is now moving into the live UI
- `Pulse / Rate Extraction` should stay one unified reusable template
- `Flowmeter` and `Fan RPM` should be treated as two presets of that same template, not as separate special-case template families

Current UI direction clarification:

- work now should assume the expanded / advanced-capable UI as the real authoring surface
- simplification for ordinary users should be layered on top later
- the next UI regrouping should separate:
  - hardware / board / chip / comms
  - automation / signals / modules / sequences / alarms
  - service / inspector / runtime observation

Reference:

- `docs/pattern-first-ui-reorganization-v1.md`

Reference:

- `docs/functional-module-model-v1.md`
- the first pilot mechanism decomposition is now fixed as:
  - `docs/boiler-pilot-module-map-v1.md`
- the first concrete module-first UI target is now fixed as:
  - `docs/module-first-ui-spec-v1.md`
  - `docs/boiler-module-first-ui-v1.md`
- the next enabling spec for implementation is now fixed as:
  - `docs/module-registry-spec-v1.md`
- the runtime behavior rules for the module-first layer are now explicitly fixed in:
  - `docs/module-runtime-contract-v1.md`
  - `docs/sequence-contract-v1.md`
- the ownership split and the concrete boiler-based abstraction example are now refined enough to serve as the first visual handoff between architecture and future Flow View:
  - `docs/logic-ownership-matrix-v1.md`
  - `docs/boiler-abstraction-map-example-v1.html`
- the first live `Flow View v1` is now also present inside the `Modules -> Logic` UI:
  - it is lane-based
  - it is currently boiler-preset-oriented
  - it shows module lanes instead of raw helper chains
- the first actual UI skeleton above the current object-first screens is now in place:
  - new `Modules` tab in `data/index.html`
  - registry-driven frontend prototype in `data/app-modules.js`
  - three mechanism views:
    - `Operation`
    - `Service`
    - `Logic`
  - first seeded workspace:
    - `Boiler Pilot`
  - first module inspector:
    - backend
    - authority
    - capability
    - required bindings
    - advanced path into low-level tabs
  - `Modules -> Logic` now includes a first typed-link builder:
    - source module
    - published output
    - semantic role
    - target module
    - target binding
  - this makes the first module-level logic constructor real instead of a read-only mock view
  - the immediate next implementation order for this layer is now explicitly:
    1. `validation/status layer for modules and links`
    2. `flow view v1`
  - this order is intentionally after:
    - `module runtime contract`
    - `sequence contract`
  - the first `validation/status layer` is now also implemented in the `Modules` UI:
    - workspace summary now shows:
      - ready modules
      - incomplete modules
      - invalid modules
      - link errors
    - each module card now surfaces a clear authoring state:
      - `ready`
      - `incomplete`
      - `isolated`
      - `warning`
      - `invalid`
    - module validation now checks required bindings against:
      - `signal:*`
      - `channel:*`
      - `module:*`
    - typed links now have their own visible validation state:
      - valid
      - invalid
      - overridden/warning when the target binding no longer matches the link
    - module inspector now explains missing or invalid bindings directly instead of only showing raw values
  - after this slice, the next module-first UI step should now be:
    - `flow view v1`
  - the first concrete target for that future `flow view v1` is now fixed visually through:
    - `docs/boiler-flow-view-example-v1.html`
    - `docs/boiler-abstraction-map-example-v1.html`
  - that example explicitly demonstrates:
    - whole-boiler parallel lanes instead of only one burner-sequence lane
    - active vs sleeping module lanes
    - warning-only vs stop/trip paths
    - state-dependent supervision for one module
    - insertion slots between existing logical nodes
  - the ownership split that should govern further UI and runtime growth is now explicitly fixed in:
    - `docs/logic-ownership-matrix-v1.md`

Current implementation note:

- this first `Modules` tab is intentionally UI-only
- it does not introduce a second runtime or separate config format
- it exists to validate module-first authoring over the existing engine before deeper backend work

### Logic Helper Pack v1

Current stage start:

- `logic_gate` is now implemented as the first helper block in the new pre-sequence layer
- runtime, config loader and block save/load path now support:
  - `and`
  - `or`
  - `not`
  - `xor`
- the Web UI now exposes `Logic Gate` as a real block type with:
  - create button
  - block filter entry
  - editor support for `Input A / Input B / Output`
  - `NOT` hiding the second input
  - route rendering in the blocks table
- cleanup/where-used now tracks the second logic input through `input_b`
- `edge_detect` is now implemented as the second helper block in the same layer
- runtime, config loader and block save/load path now support:
  - `rising`
  - `falling`
  - `both`
- the Web UI now exposes `Edge / One-shot` as a real block type with:
  - create button
  - block filter entry
  - editor support for `Input / Output / Pulse width`
  - `retrigger` option
  - route and timing rendering in the blocks table
- `hysteresis` is now implemented as the third helper block in the same layer
- runtime, config loader and block save/load path now support:
  - `high`
  - `low`
  - `outside_band`
  - `inside_band`
- the Web UI now exposes `Hysteresis / Deadband` as a real block type with:
  - create button
  - block filter entry
  - editor support for source signal, thresholds or deadband zone, and output
  - route and threshold summary rendering in the blocks table
- hysteresis runtime storage was implemented dynamically to stay within the `LilyGO T3` memory budget
- the remaining next helper slices should now move to:
- `interlock` is now implemented as the fourth helper block in the same layer
- runtime, config loader and block save/load path now support:
  - `permissive`
  - `inhibit`
  - `interlock`
- the Web UI now exposes `Permissive / Interlock` as a real block type with:
  - create button
  - block filter entry
  - editor support for:
    - optional request signal
    - permissive signal
    - inhibit/interlock signal
    - output
  - route and mode summary rendering in the blocks table
- interlock is intentionally kept signal-first:
  - if request is omitted, the block can publish plain readiness / not-blocked state
  - if request is provided, it behaves as a clean gate for commands or sequence transitions
- cleanup/where-used now also tracks:
  - `input_c`
  - `request_signal`
  - `permissive_signal`
  - `inhibit_signal`
- `mode_authority` is now implemented as the fifth helper block in the same layer
- runtime, config loader and block save/load path now support:
  - `local_remote`
  - `local_remote_service`
  - `auto_manual`
  - `auto_manual_service`
- the Web UI now exposes `Mode / Authority` as a real block type with:
  - create button
  - block filter entry
  - editor support for:
    - primary signal
    - secondary signal
    - optional service signal
    - mode-select signal
    - output
  - route and mode summary rendering in the blocks table
- mode/authority is intentionally kept signal-first:
  - it selects one already existing source signal
  - it does not auto-create channels
  - it publishes helper-owned dependent signals such as:
    - `.mode_index`
    - `.valid`
    - `.local/.remote` or `.auto/.manual`
    - optional `.service`
- mode_authority runtime storage was moved to dynamic allocation to stay within the current DRAM budget
- `freshness` is now implemented as the sixth helper block in the same layer
- runtime, config loader and block save/load path now support:
  - `fresh`
  - `stale`
  - `comm_loss`
- the Web UI now exposes `Heartbeat / Freshness` as a real block type with:
  - create button
  - block filter entry
  - editor support for:
    - monitored signal
    - timeout
    - output
  - route and timeout summary rendering in the blocks table
- freshness is intentionally kept signal-first:
  - it watches existing signal quality and age
  - it does not create channels or process timers
  - it publishes one clean binary helper for sequence, interlock, alarms and service UI
- the agreed mandatory pre-sequence helper vocabulary is now effectively in place:
  - `logic_gate`
  - `edge_detect`
  - `hysteresis`
  - `interlock`
  - `mode_authority`
  - `freshness`

### Sequence Foundation v1 / Sequence Engine v1

Current stage start:

- sequence runtime/config is now implemented through `SequenceManager`
- sequence definitions are loaded from `/config.json`, similar to alarms, without expanding `gConfig`
- sequence runtime currently supports:
  - `enable / start / trip / reset` signals
  - `initial / fault / done` states
  - per-state `permissive_signal`
  - per-state `timeout_ms -> timeout_to`
  - per-transition `when_signal`
  - per-transition `delay_ms`
  - per-transition `invert`
  - state entry actions through `actions_on`
  - state exit-style cleanup through `actions_off`
- sequence now publishes dependent service signals like:
  - `sequence.<id>.enabled`
  - `sequence.<id>.running`
  - `sequence.<id>.ready`
  - `sequence.<id>.done`
  - `sequence.<id>.fault`
  - `sequence.<id>.waiting`
  - `sequence.<id>.current_state_index`
  - `sequence.<id>.time_in_state_ms`
  - `sequence.<id>.state.<stateId>`
- recent sequence events are now stored in a lightweight ring buffer
- cleanup/where-used now tracks sequence references:
  - top-level signals
  - state permissives
  - state actions
  - transition conditions
- the Web UI now has a first working `Sequences` tab with:
  - sequence list and summary
  - sequence editor
  - state editor
  - transition editor
  - recent events
- display/service presentation now also exposes sequence system sources:
  - `system.sequence_running_count`
  - `system.sequence_fault_count`
  - `system.sequence_done_count`
  - `system.sequence_latest`
  - `system.sequence_latest_state`
  - `system.sequence_latest_status`
- the first reusable real sequence template is now in place in the Web UI:
  - `actuator start / wait feedback / run / fault`
- it seeds a practical starter scenario through the existing sequence endpoints:
  - sequence definition
  - `start_cmd` state
  - `run` state
  - `fault` state
  - feedback-driven transition to `run`
- this keeps template authoring inside the normal sequence editor path instead of creating a second special-case engine
- `Sequence Authoring / Runtime Polish v1` is now started:
  - runtime keeps richer sequence reason fields:
    - `waiting_reason`
    - `detail`
    - `fault_reason`
  - `/sequences` now exposes:
    - richer reason fields
    - pending transition signal
    - pending transition elapsed/delay timing
  - `Display` now supports:
    - `system.sequence_latest_reason`
    - `system.sequence_latest_transition`
  - `Sequences` UI now shows:
    - sequence reason under status
    - pending transition delay progress
    - more useful service-facing transition visibility
- first `Sequence action semantics` slice is now in place:
  - action targets can now be explicit:
    - plain `id`
    - `channel:<id>`
    - `signal:<id>`
    - `command:<id>`
  - default behavior is now defined:
    - plain `id` tries channel first, then signal publish
  - this keeps sequence actions usable now while making the target semantics explicit before the UI review
  - `Sequences` UI now shows that action syntax directly near the state action editor
- first `config_version + migration rule` slice is now in place:
  - top-level `config_version` is now part of the configuration model
  - current supported version is `2`
  - loader now reads `config_version` and logs when config is older or newer than the supported schema
  - every save through `web.cpp` now rewrites `config_version` to the current schema version
  - `/runtime` now exposes:
    - `config_version`
    - `config_version_supported`
  - this is intentionally a migration skeleton, not yet a full step-by-step migration engine
- `feature flags skeleton` is now in place as the third pre-UI-review stabilization slice:
  - shared compile-time header:
    - `src/config/feature_flags.h`
  - first active flags:
    - `FEATURE_LORA`
    - `FEATURE_OLED`
    - `FEATURE_COMMS`
    - `FEATURE_MODBUS`
  - build profiles:
    - `env:esp32dev`
    - `env:esp32dev_minimal`
  - LoRa and OLED now compile as safe stubs when their build flags are disabled
  - OLED-dependent display/UI render path now compiles out cleanly when OLED is disabled
  - comms runtime now compiles out cleanly when `FEATURE_COMMS=0`
  - Modbus transport/runtime now compiles out cleanly when `FEATURE_MODBUS=0`
  - `/runtime` now also exposes:
    - `features.lora`
    - `features.oled`
    - `features.comms`
    - `features.modbus`
  - both profiles are now compile-verified:
    - `pio run`
    - `pio run -e esp32dev_minimal`
- `system source registry cleanup` is now in place as the fourth pre-UI-review stabilization slice:
  - `system.*` source ids and labels are now defined in one shared runtime registry:
    - `src/runtime/system_source_registry.h`
    - `src/runtime/system_source_registry.cpp`
  - `display.cpp` no longer keeps its own hardcoded `system.*` list
  - `web.cpp` no longer keeps a separate duplicated `system.*` validation list
  - `/runtime` now exposes `system_sources[]` with:
    - `id`
    - `label_ru`
    - `label_en`
    - `data/app-display.js` now renders system source choices from runtime data instead of a hardcoded frontend list
    - this reduces a real pre-review drift risk between:
      - runtime system values
      - backend display validation
      - frontend display source selector
- `one mature real sequence template` is now in place as the fifth pre-UI-review stabilization slice:
  - the earlier starter `actuator start` seed was upgraded into a reusable `actuator + feedback` pattern
  - the template now seeds:
    - `start_cmd`
    - `run`
    - `done`
    - `fault`
  - required authoring inputs are now:
    - `start signal`
    - `stop signal`
    - `feedback signal`
    - `command target`
  - optional authoring inputs remain:
    - `enable signal`
    - `trip signal`
    - `reset signal`
    - `permissive signal`
  - the template now encodes a real mechanism flow:
    - command on in `start_cmd`
    - transition to `run` on feedback
    - transition to `done` on stop signal
    - transition to `fault` on feedback loss
    - command off in both `done` and `fault`
  - this is now the first sequence template strong enough to judge authoring UX before the large review pass

Current stage rule:

- continue sequence as a signal-first orchestration layer
- do not turn sequence into a hidden generator of many ordinary helper blocks
- keep channels explicit and physical
- use helper blocks to improve authoring clarity, not to replace sequence runtime
- continue with real reusable sequence scenarios/templates instead of returning to abstract helper growth

Pre-UI-review stabilization order is now explicitly fixed:

1. `Sequence action semantics`
2. `config_version + migration rule`
3. `feature flags skeleton`
4. `system source registry cleanup`
5. `one mature real sequence template`
6. `full UI review`

Current next step inside that order:

- `full UI review`

Current active review structure:

1. `Overview`
2. `Channels`
3. `Blocks`
4. `Comms`
5. `Alarms`
6. `Sequences`
7. `Display`
8. cross-tab consistency pass

## Growth Notes From Current Architecture Review

- the main architecture layering is currently healthy:
  - `resources -> channels -> signals -> blocks/helpers -> alarms/display/sequences`
- this layered model should be preserved and not bypassed by new subsystems
- the main structural debt that can later slow growth is now clearly visible:
  - [`src/web/web.cpp`](c:/Users/Administrator/Documents/PlatformIO/Projects/ShipController/src/web/web.cpp) is still too monolithic
  - [`data/index.html`](c:/Users/Administrator/Documents/PlatformIO/Projects/ShipController/data/index.html) remains a very large single-file shell
  - `system.*` display/service sources are duplicated across runtime, backend validation and frontend selectors
  - config loading is now intentionally split:
    - part through `gConfig`
    - part direct from `/config.json` for heavier dynamic subsystems like alarms and sequences
- this split is acceptable for current memory pressure, but it should stay explicit in future design decisions

## Done

### Core Runtime

- Config-driven runtime is active and no longer tied only to hardcoded board logic.
- Chip templates and board templates are implemented and editable from Web UI.
- Hardware availability map supports `safe`, `warning`, `shared`, `exclusive`, `forbidden`.
- Active board, board template, and chip template are logically connected in runtime and UI.
- Runtime signal layer exists through `SignalRegistry`.
- Signals are no longer only physical channels; derived and block-produced signals are supported.

### Implemented Runtime Blocks

- `selector`
- `button`
- `timer`
- `latch`
- `comparator`
- `scale_map`
- `logic_gate`

Implemented timer modes:

- `pulse`
- `delay_on`
- `delay_off`
- `interval`
- `interval_while_enabled`

Timer runtime now also publishes display-friendly signals per timer instance:

- `timer.N.active`
- `timer.N.remaining`
- `timer.N.running`
- `timer.N.phase_remaining`

The interval timer semantics are now aligned with the UI/runtime wording:

- `ON time` means how long the output stays on
- `full cycle` means the whole cycle from one ON start to the next ON start
- off-time is therefore `full cycle - ON time`

Implemented latch modes:

- `toggle`
- `set_reset`
- `set_only`
- `reset_only`

Implemented comparator modes:

- `gt`
- `ge`
- `lt`
- `le`
- `eq`
- `ne`
- `between`
- `outside`

Implemented scale/map modes:

- `scale`
- `map`
- `clamp`

Implemented logic-gate modes:

- `and`
- `or`
- `not`
- `xor`

Implemented button outputs:

- `.pressed`
- `.released`
- `.short_press`
- `.long_press`
- `.double_press`
- `.held`

### Web UI

- Flash pressure is now one of the main technical constraints.
- The biggest near-term flash optimization path is now fixed:
  - move the Web UI payload out of firmware
  - serve it from `LittleFS`
  - keep API routes in firmware
- Main tabs exist: `Overview`, `Hardware`, `Templates`, `Channels`, `Signals`, `Blocks`, `Display`, `Alarms`, `Comms`, `Inspector`, `Diagnostics`, `Network`
- `Overview` is already closer to dashboard style than raw debug dump
- UI mode switch now exists for:
  - `Operator`
  - `Commissioning`
  - `Advanced`
- The selected UI mode is stored in browser local storage and survives reloads.
- Network settings now also include an OLED-specific toggle for the fallback screen:
  - show IP on OLED
- The fallback OLED screen now follows config instead of always forcing the IP line.
- `/runtime` now also exposes the OLED fallback flag correctly, so the Web UI can preserve the saved `show IP on OLED` checkbox state after reload.
- `Display v1` now also supports lightweight system sources without polluting the normal signal model:
  - `system.ip`
  - `system.wifi_mode`
  - `system.active_board`
  - `system.board_template`
  - `system.chip_template`
- These sources are selectable in the display widget editor and are meant for service/operator text on OLED screens.
- The default example `display` config now uses `system.ip` on the first line of the main screen so the OLED can show the currently active address for STA or AP mode without inventing a fake process signal.
- Tabs are now filtered by mode instead of exposing all engineering tools at once.
- A mode explanation strip now tells the user why some screens and actions are visible or hidden.
- `Overview` now hides deeper internals unless the UI is in `Advanced` mode.
- `Detect Chip` is hidden in `Operator` mode to reduce accidental engineering actions.
- `Diagnostics` is now an `Advanced` tool instead of part of the default commissioning surface.
- The extra runtime status table in `Channels` is now hidden outside `Advanced`.
- Deep reference/help accordions in `Signals` are now hidden outside `Advanced`.
- `Signals` uses modal editing
- `Blocks` uses modal editing
- The main Web UI has been extracted into `data/index.html` and can now be served from `LittleFS`.
- The firmware root handler now uses a small built-in fallback page only when `/index.html` is missing from the filesystem.
- This reduced firmware flash usage from about `94.3%` to about `76.5%`.
- The extracted file-based UI has now been split into:
  - `data/index.html`
  - `data/app.css`
  - `data/app.js`
- The largest frontend dictionaries have now also been extracted into:
  - `data/app-i18n.js`
  - `data/app-help.js`
  - `data/app-ui-text.js`
- The frontend runtime has now been split into:
  - `data/app.js` for shared core/helpers
  - `data/app-features.js` for UI logic, renderers, and actions
  - `data/app-init.js` for event wiring and bootstrap
- The large feature layer is now also split by area:
  - `data/app-signals.js`
  - `data/app-blocks.js`
  - `data/app-display.js`
  - `data/app-templates.js`
- `data/app-features.js` is now reduced to shared rendering/actions for:
  - overview
  - channels
  - inspector/diagnostics
  - network/settings
  - global loading/bootstrap
- The previous duplicate function copies inside `data/app-features.js` were removed during this split, reducing future regression risk.
- This creates a safe path for moving help and localization out of the main page later without changing the backend API contract.
- The first `Analog I/O v1` foundation slice is now in place at the config/UI/API level:
  - `/channels` now exposes analog metadata fields
  - `/channel-binding` now persists analog metadata fields
  - the `Channels` editor now shows analog setup for `AI/AO`
  - profile, units, engineering range, clamp, filter and AO startup value can now be edited from the Web UI
- This first analog slice intentionally keeps metadata in config/API instead of storing it inside the main runtime config arrays.
- That DRAM-safe choice avoids bloating `gConfig` before the analog conditioning runtime is ready.
- `AI` runtime now also has a first conditioning path in `SignalRegistry`:
  - raw ADC read
  - engineering range mapping
  - scale/offset
  - optional EMA smoothing
  - optional clamp
  - basic `out_of_range` quality/status
- Analog runtime metadata is loaded dynamically from `config.json` during signal configuration instead of being expanded inside `gConfig`.
- This keeps DRAM stable while still allowing engineering-value publishing for configured `AI` signals.
- `AO` is still only partially staged:
  - config/UI/API metadata exists
  - startup output is now applied in runtime for ESP32 DAC-capable pins (`GPIO25`, `GPIO26`)
  - resource-backed `AO` signals now publish feedback based on the configured analog range metadata
  - the current `AO v1` scope is intentionally limited to DAC-style local output, not a universal industrial AO backend yet
- Analog commissioning polish has now started in the `Channels` editor:
  - analog profiles have short explanatory notes
  - a live preview card now shows:
    - channel
    - profile
    - raw value
    - engineering value
    - quality
    - status
  - for `AI`, preview also surfaces the diagnostics raw window/classification when available
  - for `AO`, preview shows startup value and reminds the user about DAC-capable local pins
  - preview now refreshes both while editing analog fields and after channel/status/diagnostics refresh actions
  - a lightweight conditioning helper now also exists:
    - scale summary
    - filter/clamp summary
    - quick validation notes for broken ranges
    - `use live raw window` button for existing `AI` channels with diagnostics data
    - `reset analog math` button as a safe commissioning fallback
- `Guided Calibration v1` has now started as a lightweight first commissioning slice inside the `Channels` analog editor:
  - `AI` channels now expose a `two-point calibration` card
  - the user can enter low/high engineering reference values
  - the user can capture current live raw values as low/high calibration points
  - the assistant can apply those two points back into:
    - `raw_min`
    - `raw_max`
    - `eng_min`
  - `eng_max`
  - the assistant resets `offset` and `scale` to neutral values when applying a new two-point range
  - the assistant also supports rollback to the editor snapshot taken when the calibration session begins
  - saving the channel now commits the saved analog values as the new rollback baseline for the current session
  - the calibration card now behaves more like a guided flow:
    - it shows the next recommended calibration step
    - it blocks apply until both points and engineering bounds are valid
    - it blocks point capture until live raw is available
    - it now has an explicit `check result` phase before save:
      - after apply, the operator can verify the estimated engineering value for the current live raw
      - the flow now reads naturally as `capture low -> capture high -> apply -> check result -> save`
    - it now also shows compact process states inside the card:
      - low point captured / not captured
      - high point captured / not captured
      - engineering bounds valid / need attention
      - scale applied / not applied
      - saved baseline matched / unsaved changes present
  - this is intentionally a safe UI-first calibration layer on top of the existing analog runtime, not yet a full domain-specific wizard
- `Blocks` now also has a scenario-first layer:
  - quick scenarios on the main tab
  - scenario selector inside block editor
  - internal `type/mode` moved toward a more secondary engineering layer
- the block editor is now also grouped into user-facing sections:
  - control source and logic
  - output target
  - timing
  - advanced
- empty sections in the block editor are now hidden when they are not relevant to the selected scenario
- Help popover exists and supports `ru/en`
- Russian is default UI language
- `units` supports presets plus custom input
- `Blocks` supports `Button`, `Timer`, `Latch`, `Selector`
- `Blocks` now also supports `Comparator`
- `Blocks` now also supports `Scale/Map`
- The block editor now has a dedicated UX spec in `docs/block-editor-ux-v1.md`.
- The block editor now hides raw block IDs from normal commissioning flow.
- New blocks use auto-generated internal IDs by default.
- The block editor now shows a human-readable action summary instead of exposing only the raw internal ID.
- Manual block ID mode is available only in `Advanced`.
- Existing saved blocks currently keep stable IDs instead of supporting ad-hoc renames.
- GPIO assistant wording is now shorter and more user-facing:
  - `Запуск`
  - `Вкл/выкл`
  - `Включить`
  - `Выключить`
- The block editor layout is now denser and more compact in the GPIO assistant area, with less empty space and clearer row-based roles.
- Quick scenarios are no longer shown as a separate noisy layer on the main `Blocks` screen.
- Scenario choice now stays inside the block editor modal.
- `Scale/Map` now follows the same block editor pattern as the other logic blocks:
  - source signal
  - output signal
  - mode-specific parameters only
  - compact summary in the block preview area
- Timer timing fields now support user-facing units:
  - `ms`
  - `seconds`
  - `minutes`
  - `hours`
  - `days`
- Timer editor wording is calmer:
  - `ON time`
  - `OFF time`
  while runtime still stores milliseconds internally.
- `Scale/Map` editor now supports:
  - `Scale + Offset`
  - `Map Range`
  - `Clamp Range`
  with only the relevant numeric fields shown for each mode.
- `Scale/Map` is now better integrated into the scenario-first block editor:
  - it has its own user-facing scenario in the scenario selector
  - output label/help now switches to a dedicated `output signal ID` explanation
  - inline help exists for source, output and mode-specific numeric fields
- For interval modes, the editor now converts between:
  - user-facing `ON time + OFF time`
  - internal `duration_ms + period_ms (full cycle)`
- This keeps the runtime clean while making cyclic timers much easier to configure for ordinary users.
- The block table and assistant preview now also speak in the same `ON/OFF` language for interval timers instead of exposing full-cycle math.
- Interval timers now also show an inline cycle reminder in the editor:
  - `ON -> OFF -> repeat`
- Selector and comparator descriptions are now more user-task oriented in the editor instead of reading like engine internals.
- GPIO assistant visibility is now mode-aware:
  - hidden for pure interval mode by default
  - shown for trigger-driven timer modes only when relevant
  - only relevant latch rows are shown
- The `Advanced` block section is now grouped more calmly into:
  - service/internal settings
  - behavior flags
- The block editor now shows a short inline explanation for the currently selected block mode.
- Timer and latch modes now explain themselves in plain language directly in the form, so the user can see when a mode is for:
  - pulse
  - delay
  - interval
  - toggle
  - set/reset
- Comparator modes now explain whether the block compares:
  - against a fixed setpoint
  - against another signal
  - inside a range
  - outside a range
- Mode names in the block editor are now more scenario-like and less engine-like:
  - `Pulse on Trigger`
  - `Self-running Interval`
  - `One Button: On/Off`
  - `Separate On and Off`
- Comparator is now integrated into the same block-editor flow as the rest of the logic blocks:
  - comparator input signal
  - optional compare signal
  - setpoint A / B
  - output target
  - table rendering and edit/save cycle
- Web serving groundwork for flash optimization now exists:

## Next Recommended Work

Historical note:

- the detailed section below captures earlier planning context
- the active execution order is now governed by:
  - `docs/major-update-roadmap-to-sequence-v1.md`
- the current live phase after the now-done-enough `Modbus RTU v1` slice is:
  - `Alarm v1`

### 1. Analog I/O v1

Reason:

- this is the strongest unfinished foundation piece for `Stage 2: Industrial I/O`
- it strengthens `display`, `comparator`, `scale_map`, and future `alarm`
- it should come before deep protocol work

Main target:

- finish the remaining runtime side of Analog I/O after the now-complete AI conditioning baseline
- polish analog commissioning UX and prepare `Guided Calibration v1`

### 2. Guided Calibration v1

Reason:

- calibration math alone is not enough for real commissioning
- the product should support wizard-style setup similar to instrument/service tooling
- this is where flowmeter-style known-volume and known-reference calibration belongs

Main target:

- continue calibration workflows with save/apply/rollback on top of the finished analog model
- expand from the current lightweight two-point editor assistant toward:
  - clearer guided steps
  - known-reference flows
  - domain-specific calibration such as flowmeter known-volume setup

### 2.5 Commissioning Polish For Analog

Reason:

- engineering runtime alone is not enough for real setup work
- the analog path should be readable and testable by a technician before moving on

Main target:

- live preview of raw / engineered / quality
- clearer profile wording
- better calibration entry points in the editor
- enough polish that analog no longer blocks the next stage

### 3. Communications Foundation v1

Reason:

- Modbus, UART and I2C should not be implemented as isolated hacks
- they need a shared model:
  - bus/port
  - device
  - poll scheduler
  - signal mapping
  - communication quality/status

Current implementation note:

- the practical foundation spec is now written down in `docs/comms-foundation-spec-v1.md`
- the agreed first code slice is intentionally narrow:
  - bus config structs
  - device config structs
  - runtime registries for buses/devices
  - basic `GET/POST` API for buses and devices
  - simple Web UI lists/editors
- that first slice is now implemented:
  - `config.json` can now store top-level `buses` and `devices`
  - runtime now has a compact `CommsRegistry` with basic bus/device state
  - Web API now exposes:
    - `GET /buses`
    - `POST /bus`
    - `POST /bus-delete`
    - `GET /devices`
    - `POST /device`
    - `POST /device-delete`
  - the file-based UI now has a first `Comms` tab with:
    - bus list/editor
    - device list/editor
    - runtime status visibility
- the shared external-resource model is now also implemented:
  - `config.json` can now store top-level `external_resources`
  - runtime now tracks external resource state in `CommsRegistry`
  - Web API now exposes:
    - `GET /external-resources`
    - `POST /external-resource`
    - `POST /external-resource-delete`
  - the `Comms` tab now includes:
    - external resource list
    - external resource editor
    - device-linked runtime status visibility
- the shared `external resource -> channel` path is now also wired through the normal channel model:
  - channels can now bind either:
    - local GPIO-backed resources
    - external resources
  - the `Channels` editor now has a source selector:
    - `Local GPIO`
    - `External resource`
  - external-resource channels now use the same `channel -> signal` path as local channels instead of a parallel special case
  - `ResourceManager` now accepts external bindings without pretending they are GPIOs
  - external DI/DO/AI/AO channels now have placeholder runtime behavior for the current foundation stage:
    - DI/AI default to external placeholder values until real drivers/polling exist
    - DO keeps a shadow state
    - AO keeps startup/shadow raw state
  - resource-backed signals now reflect external-resource quality/status through the normal signal layer:
    - `stale`
    - `fault`
    - device-derived status text
  - deleting an external resource is now blocked if channels still reference it
  - the first real external device template is now also in place:
    - `ADS1115 v1`
    - `CommsRegistry` now performs real I2C polling for devices with `driver = ads1115`
    - exported external resources with:
      - `kind = analog_in`
      - `capability = ai`
      - `source_index = 0..3`
      now publish real raw values instead of placeholder values
    - external `AI` channels now read those values through the normal `resource -> channel -> signal` path
    - `/external-resources` now exposes `raw_value` for runtime visibility in the Web UI
    - current deliberate limitation:
      - only the primary configured I2C bus is active in `v1`
      - additional I2C buses are marked as inactive until the shared transport layer grows further
      - `ADS1115` is the first real external ADC only; external DAC and other drivers are still future work
  - the next code stage should still avoid:
    - jumping directly to Modbus RTU
    - jumping directly to more chip-specific ADC/DAC drivers without stabilizing the first template
    - inventing a second channel architecture for bus-backed values

### External ADC/DAC Expansion

- external multi-channel analog devices are now explicitly planned through:
  - bus model
  - device model
  - external resource model
- the current agreed first targets are:
  - one practical multi-channel external ADC
  - one practical multi-channel external DAC
- they should not be wired in as bespoke `AI/AO` exceptions
- the first safe step is architectural:
  - define `bus -> device -> external resource`
  - keep chip-specific drivers for the next step

### 4. Modbus RTU v1

Reason:

- strongest industrial value for the next protocol layer
- best first real protocol to validate the shared communications foundation

### Delivery Guardrails In Practice

- do not start a major new stage before the current one has:
  - stable config behavior
  - real runtime behavior
  - minimum commissioning UX
  - acceptable memory impact
- do not add protocol-specific resource models that bypass the shared `bus -> device -> external resource` path

See also:

- `docs/analog-io-and-comms-roadmap-v1.md`

### Flash And UI Serving Notes

- `/` first tries to serve `/index.html` from `LittleFS`
- unmatched static file requests also try `LittleFS`
- current built-in UI remains as fallback during migration
- to preserve DRAM while adding the communications slice, one internal template limit was tightened:
  - `MAX_TEMPLATE_RULE_PINS` is now `10` instead of `12`
  - this does not affect current built-in templates, but should stay visible as a budget decision

### Display Architecture

- `Display Model v1` is now documented in `docs/display-model-v1.md`.
- `Display Implementation Spec v1` is now documented in `docs/display-implementation-spec-v1.md`.
- Display is explicitly fixed as a view over existing `signals`, not a separate value model.
- The future display system is planned around:
  - `screens`
  - `widgets`
  - `signal binding`
  - `formatting`
  - `navigation`
  - `dependency tracking`
- The first intended widget family is:
  - `label`
  - `value`
  - `status`
  - `pair`
  - `timer`
  - `bar`
  - `spacer`
- Display config schema is now present in code through `SystemConfig.display`.
- `config.json` can now define top-level display settings, screens, widgets, formatting, and style.
- First display runtime type scaffolding now exists in `src/runtime/display_types.h`.
- Display config storage was intentionally implemented with dynamic screen/widget lists instead of large static arrays, to preserve ESP32 DRAM headroom.
- The future `Display` tab behavior is now specified:
  - simple in `Commissioning`
  - more detailed in `Advanced`
  - same list/editor/help/dependency patterns as the rest of the UI
- A first display runtime resolver now exists and binds widget/screen visibility and value widgets to signal indexes.
- Basic formatter helpers now exist for:
  - numeric values
  - boolean/status values
  - duration-oriented values
- OLED rendering now prefers the new `display` model when configured and falls back to the old `screens` UI model otherwise.
- `data/config.json` now includes a first practical `display` example for OLED.
- A first Web `Display` overview tab now exists:
  - shows display runtime summary
  - shows configured screens
  - shows widgets and signal binding status
- The Web UI now has a first minimal `Display` editor:
  - create and delete screens
  - create and delete widgets
  - bind widgets to existing signals
  - configure basic formatting fields
- The `Display` tab is now less of a special-case island:
  - screen summary is rendered as its own card
  - display labels are more Russian-first by default
  - widget editor is grouped into `main / formatting / position`
  - operator mode does not expose widget edit actions as prominently as commissioning/advanced
- Display is now part of the shared dependency model:
  - helper cleanup review can see when a signal is still used by a display screen or widget
  - display bindings are no longer invisible to where-used analysis
- Multi-screen navigation and the future Web `Display` editor are still future implementation work.

### Block Assistant

- `GPIO Assistant` exists in block editor
- It can auto-create helper chain objects for timer and latch scenarios
- It can select available GPIO from current hardware map
- It can choose button event:
  - `short_press`
  - `long_press`
  - `double_press`
  - `pressed`
  - `released`
  - `held`
- It can set `pull-up`
- It can set `inverted`
- It can choose output contact from available outputs
- It shows a generated-chain preview before save

### Ownership Metadata

The system now stores ownership metadata for auto-created helper objects:

- `auto_generated`
- `generated_by`
- `generated_role`

This is already written for auto-created helper channels and helper button blocks.

The metadata is already surfaced in API/UI for:

- channels
- blocks

This is the basis for future dependency review and safe cleanup.

### Smart Cleanup Review

The first working version is now implemented.

Current behavior:

- deleting a block no longer has to be a blind action
- the UI can request a delete review for the selected block
- the review shows auto-created helper objects related to that block
- the review also shows where those helpers are referenced
- the user can choose which related helper objects should be removed together with the block
- the review now explains dependencies in more human-readable UI terms instead of raw `kind/id/field`
- helper candidates are shown as auto-created channels or blocks with role descriptions
- the review now shows clearer keep/delete intent in the modal itself
- the review now supports quick actions for selection:
  - keep all
  - select recommended
  - select all
- the review now shows how many related objects are currently selected for deletion

Current review scope:

- generated helper channels
- generated helper blocks
- references from blocks
- references from user-defined signals
- references from display screen visibility
- references from display widgets

This is intentionally a first version, not the final cleanup system.

Not yet covered:

- future alarm references
- future sequence references
- detach-only actions

## In Progress

### Communications Foundation v1

- the first config/runtime/API/UI slice is now in place
- the shared external-resource runtime model is now in place too
- the shared channel/resource integration step is now also in place
- the first real external device template is now in place too:
  - `ADS1115 v1`
- external analog commissioning polish has now started too:
  - `Channels` now shows external resource runtime more explicitly for external `AI`
  - `Channels` conditioning summary now shows:
    - device
    - live external raw
    - external quality/status
    - last runtime update when available
  - `Channels` live preview now shows:
    - external resource runtime status
    - external raw value
    - the final engineering signal value in the same view
  - `Comms` now gives clearer `ADS1115` editor hints:
    - driver note for devices
    - channel/source-index note for external resources
  - `Channels` now also applies a more realistic raw-default for `ADS1115` external `AI`:
    - when a fresh external `AI` is pointed to an `ads1115` resource, the editor prefers `0..32767` instead of the local ESP32-style `0..4095`
    - the analog profile note now explains that expectation directly in the editor
  - `Comms` device editor now also includes a quick `ADS1115` helper:
    - one button seeds `ch0..ch3` as external `analog_in / ai` resources
    - already existing resources are skipped, not overwritten
    - this makes first commissioning much faster without changing the shared model
  - because physical `ADS1115` hardware is not currently available, the next safe validation layer is now:
    - `virtual_ai v1`
    - it is intended to test the same shared external-resource path without real hardware
    - this avoids jumping into multiple real ADC drivers blindly
  - `virtual_ai v1` is now implemented as a first no-hardware external analog device template:
    - device editor supports:
      - mode
      - raw min/max
      - manual raw
      - period
    - the device editor can seed `virtual ch0..ch3` in one step
    - the generated values now flow through the same path as real external analog:
      - external resource runtime
      - channel binding
      - normal signal publishing
  - `External Analog UX Pack v1` is now started:
    - the broad parallel test track is intentionally deferred to the later final stabilization pass
    - `Comms -> External Resources` now has a direct `Bind` action
    - this action opens the `Channels` editor with:
      - external source mode selected
      - channel type inferred from the resource capability
      - resource already selected
      - suggested channel ID prefilled
    - this reduces the manual friction between exported external resources and actual channel creation
    - `Comms` device editor is now more driver-aware too:
      - common drivers are selectable directly instead of being a blind free-text field
      - the editor now exposes a `recommended fields` helper for supported templates
      - `ADS1115` can now quickly suggest:
        - address
        - poll interval
        - timeout/retry defaults
      - `virtual_ai` can now quickly suggest:
        - virtual mode defaults
        - raw range
        - timing defaults
    - `Comms -> External Resources` now also has a direct `Display` action
    - this action opens the `Display` widget editor with:
      - current screen preselected when available
      - widget type inferred from resource capability
      - label and units prefilled from the external resource
      - signal auto-selected when that resource is already bound through a channel
    - this reduces the manual gap between:
      - exported external resource
      - bound channel/signal
      - first operator-visible display widget
    - `Comms` now also surfaces the downstream path of an external resource directly in its own table/editor:
      - linked `channel`
      - linked `signal`
      - display usage count
    - this means the operator no longer has to guess whether an external resource is still only exported or already visible in the real control path
    - the external-resource editor is now also more scenario-driven:
      - `recommended fields` can now fill:
        - `kind`
        - `capability`
        - `source index`
        - suggested `resource_id`
        - suggested label
      - this is currently driver-aware for:
        - `ADS1115`
        - `virtual_ai`
      - the editor can now also jump directly to:
        - `Bind`
        - `Display`
        after the resource is saved
    - the path is now also tighter inside `Comms` itself:
      - from a device editor, the operator can now open a prefilled new external-resource editor for that device
      - from an external-resource editor, the operator can now jump directly to the already linked `channel` editor when a channel exists
  - `Device Template Pattern v1` is now also started as the next phase transition:
    - the driver-aware UI is no longer meant to stay as scattered special cases
    - the frontend now has the beginning of a shared template registry for supported drivers
    - this registry is becoming the single place for:
      - driver notes
      - device defaults
      - resource defaults
      - seed/quick-action labels
      - seed template identifiers
      - device-summary formatting in `Comms`
    - `ADS1115` and `virtual_ai` are now the first templates being normalized under that pattern
    - the backend seed-helper path is now also template-driven:
      - seed-template matching is no longer hardcoded as one manual branch per current driver
      - this keeps the first DAC/device additions much closer to the same pattern
  - `External DAC v1` is now also started with the first real external AO path:
    - `MCP4728` is now the first DAC template in the shared device-template registry
    - backend seeding now supports `mcp4728_channels`
    - seeded external resources are created as:
      - `kind = analog_out`
      - `capability = ao`
      - `source_index = 0..3`
    - `CommsRegistry` now has a dedicated external analog write path:
      - `writeExternalAnalogRaw(resourceId, rawValue)`
    - the first `MCP4728` driver slice now writes per-channel raw values over I2C and reflects:
      - resource `status`
      - resource `quality`
      - last raw value
      - device online/write status
    - `ResourceManager` now routes external `AO` writes through the same shared `channel -> resource -> device` model instead of pretending they are local GPIO DACs
    - this means the platform now has:
      - one real external input template baseline: `ADS1115`
      - one real external output template baseline: `MCP4728`
    - real-hardware validation for `MCP4728` is still pending, but the first compile-verified runtime/UI path is now in place
    - the first commissioning polish for external `AO` is also in place:
      - `Channels` now understands `MCP4728` as a 12-bit external DAC target
      - external `AO` defaults now prefer:
        - `raw 0..4095`
        - matching engineering range when the user has not defined a physical scale yet
      - channel notes and profile hints now explain that `MCP4728` is best commissioned from the full raw range first
      - `Channels -> Быстрая подготовка` now shows:
        - external device id
        - driver
        - live/raw feedback from the external resource
        - startup value
      - `Channels -> Live Preview` now explains external `AO` in user-facing language and shows the last written raw/status path instead of leaving it implicit
    - the `device -> resource -> AO channel -> signal/display` path is now more explicit from the channel editor itself:
      - the channel editor can now jump directly to the linked external resource
      - the same editor can now open a prefilled display widget for the current saved channel
      - this reduces another manual hop between `Comms`, `Channels` and `Display` when commissioning external DAC outputs
    - `Comms -> Devices` is now also more direct for template-driven devices:
      - device rows now expose `Seed` when the template supports auto-resource creation
      - device rows also expose `Resource` to open a prefilled external-resource editor immediately
      - this makes first setup of `ADS1115` and `MCP4728` noticeably shorter without changing the shared model
    - direct commissioning write is now available for external `analog_out / ao` resources:
      - backend now exposes `/external-resource-write`
      - `Comms -> External Resource Editor` now shows a `Быстрая запись AO` card for `analog_out / ao`
      - it supports:
        - manual raw value
        - quick `0 / Mid / Max`
        - immediate write to the external resource
      - for `MCP4728 v1`, the quick-write helper now uses the expected `0..4095` range
      - this makes first bench validation of an external DAC channel possible without going through the full channel logic path first
    - table readability is now also improved for the external DAC path:
      - `Channels` now shows external device id, driver, last raw and resource status directly in the resource column
      - `Comms -> External Resources` now also surfaces:
        - driver
        - last raw
        - explicit write status for `ao`
      - this reduces the need to open multiple editors just to understand whether an external DAC channel is already alive
    - `Comms -> Devices` is now also more overview-friendly:
      - each device row now shows how many exported resources it owns
      - for external analog templates it also shows:
        - `ai/ao` counts
        - linked channel count
        - linked signal count
        - display usage count
      - this makes it easier to see whether a device like `MCP4728` is only declared, or already integrated into real channels and screens
- the next sub-step should be:
  - treat `External DAC v1` as done enough for the current stage
  - keep `ADS1115 v1` as the real-template input baseline
  - keep `MCP4728 v1` as the real-template output baseline
  - keep `virtual_ai v1` as the no-hardware commissioning/runtime validation template
  - continue `Modbus RTU v1`
  - keep the shared model unchanged:
    - `bus -> device -> external resource -> channel -> signal`

### Modbus RTU v1

- `Modbus RTU v1` is now started with the first real protocol-backed slice:
  - `modbus_rtu` is now a first-class device template in `Comms`
  - the template explains:
    - UART/RS485 usage
    - slave id in `Address`
    - first supported resource combinations
  - the external-resource editor now also exposes ready Modbus resource profiles:
    - `Input Reg AI`
    - `Holding Reg AO`
    - `Discrete In DI`
    - `Coil DO`
  - this means the first Modbus commissioning flow is no longer only manual `kind/capability` editing
  - the device editor now also exposes those Modbus resource profiles directly:
    - the user can start a prefilled `Input Reg / Holding Reg / Discrete In / Coil` resource straight from the device
  - direct commissioning write in `Comms` now also supports:
    - `coil / do` via quick `OFF / ON`
  - the `Comms` tables now present Modbus-backed resources in more human-readable form:
    - `Input Register`
    - `Holding Register`
    - `Discrete Input`
    - `Coil`
  - and show address plus read/write function profile directly in the row summary
  - serial/RS485 transport groundwork now exists in `CommsRegistry`
  - v1 currently activates one primary UART/RS485 bus, similar to the primary-I2C rule already used earlier
  - the first Modbus RTU read path is now compile-verified for:
    - `register / ai` -> Input Register (`FC04`)
    - `register / ao` -> Holding Register (`FC03`)
    - `coil / di` -> Discrete Input (`FC02`)
    - `coil / do` -> Coil (`FC01`)
  - the first Modbus RTU write path is now compile-verified for:
    - `register / ao` -> Write Single Register (`FC06`)
    - `coil / do` -> Write Single Coil (`FC05`)
  - external `DO` writes now route through `CommsRegistry` instead of stopping at the resource binding
  - the generic `/external-resource-write` helper now works for any `AO` resource, including `register / ao` Modbus resources
  - direct AO commissioning in `Comms` is now therefore usable for:
    - `MCP4728`
    - future `Modbus RTU register/ao`
- what is still intentionally not done in this first slice:
  - multi-bus serial scheduling
  - bulk register maps
  - advanced diagnostics pages
  - deep Modbus commissioning polish
- `Modbus RTU v1` is now considered done enough to move to the next approved phase:
  - the shared transport/resource/channel model is intact
  - first real resource commissioning exists
  - readable device/resource UX exists
  - direct `AO/DO` commissioning exists

### Alarm v1

- `Alarm v1` has now started as the next approved stage with a deliberately narrow first slice:
  - boolean alarm source from existing signals
  - optional enable/inhibit signal
  - severity
  - activation delay
  - latched behavior
  - acknowledge-required behavior
  - lightweight recent event ring buffer
- the runtime layer now exists in:
  - `src/runtime/alarm_manager.h`
  - `src/runtime/alarm_manager.cpp`
- alarms are configured dynamically from `config.json` instead of expanding `gConfig`, to keep DRAM pressure under control
- the runtime is now integrated into:
  - `systemInit()`
  - `applyRuntimeConfig()`
  - `systemUpdate()`
- Web API now exposes the first alarm routes:
  - `GET /alarms`
  - `POST /alarm`
  - `POST /alarm-delete`
  - `POST /alarm-ack`
- the file-based UI now has a first `Alarms` tab with:
  - summary cards
  - active alarm list
  - all alarms table
  - recent events table
  - simple editor for alarm definitions
- `Overview` now also surfaces a lightweight alarm snapshot:
  - active alarms
  - pending alarms
  - alarms waiting for acknowledge
  - latest active alarm label
- alarms are now also visible to the shared dependency/reference layer:
  - cleanup review can report when an auto-generated helper is still used by an alarm
  - user-defined derived signals can no longer be deleted blindly if an alarm still references them as:
    - `source_signal`
    - `enable_signal`
- this first slice intentionally does not yet include:
  - threshold wizards inside the alarm editor
  - advanced service/alarm history UX
  - bulk grouping/escalation trees
  - sequence integration
- current intent remains:
  - keep `Alarm v1` narrow and usable
  - then move into `Alarm UX / Service Pack v1`

### Alarm UX / Service Pack v1

- `Alarm UX / Service Pack v1` has now started as the next approved stage on top of the narrow runtime alarm base
- display/service presentation now has dedicated lightweight system sources for alarm summary:
  - `system.alarm_active_count`
  - `system.alarm_pending_count`
  - `system.alarm_unacked_count`
  - `system.alarm_latest`
  - `system.alarm_latest_severity`
  - `system.alarm_latest_status`
- these sources are now available both in:
  - `src/ui/display.cpp`
  - the display backend validation path in `src/web/web.cpp`
  - the widget source selector in `data/app-display.js`
- the `Alarms` tab is now more operator/service oriented:
  - filter by:
    - active/pending
    - unacked
    - critical
    - warning
    - all
  - clearer alarm summary cards now also show:
    - pending alarms
    - alarms waiting for acknowledge
  - active alarms and all alarms now use clearer severity/status/ack pills instead of mostly raw text
  - recent events now present event type and severity in the same visual language
- the `/alarms` API now also exposes summary fields needed for service/operator views:
  - `pending_count`
  - `unacked_count`
  - `latest_active_id`
  - `latest_active_label`
  - `latest_active_severity`
  - `latest_active_status`
- the `Alarms` tab now also has direct shortcuts into `Display` for:
  - active alarm count
  - unacked alarm count
  - latest active alarm label
- these shortcuts prefill a widget with the corresponding `system.alarm_*` source instead of forcing manual signal/source selection

### UX and Localization

- Russian translation is being expanded beyond static help text.
- `Blocks` and `GPIO Assistant` are now partially localized, but not yet fully consistent across all statuses and all tabs.
- The assistant help model is now in place, but broader UI translation is still incomplete.

### Ownership and Cleanup Model

Ownership metadata has been introduced, but the cleanup workflow is not finished yet.

Already done:

- ownership metadata on auto-created helpers
- review endpoint for block deletion
- UI modal for deletion review
- user-selectable helper deletion

Not done yet:

- dependency graph inspection for generated helper objects
- references from future display/alarm/sequence layers
- selective "remove links but keep object" actions
- richer reference categories and explanations

## Agreed Next Steps

### Platform Scaling Direction

The approved direction is:

- keep one shared repository
- keep one shared platform core
- allow future multi-target builds in the same project
- use compile-time feature selection when a product variant does not need a subsystem such as `LoRa`
- keep `ESP32-C3` as the first compatibility/satellite ESP-class target
- plan future custom satellites by role, not by one-chip-fits-all

The approved sequencing is:

1. continue current feature work on the main controller
2. keep `LilyGO T3` as the active reference target for now
3. finish the current functional scope
4. perform a full UI revision pass
5. then move into:
   - satellite firmware targets
   - dedicated main-controller test bench hardware
   - deeper repo/source-tree reorganization

Approved future target split:

- `ESP32-C3` stays in the plan as the first compatible ESP satellite/dev target
- future own simple satellites should prefer `RP2040` or `STM32G0/C0`
- future own motion satellites should prefer `STM32G4`

Source-tree reorganization may be prepared early, but should not derail the current main feature path.

### Communications Foundation v1

Follow this order:

1. keep the new `buses/devices` slice stable
2. keep the new `external resources` slice stable
3. keep the new external-resource-to-channel path stable
4. keep `ADS1115 v1` stable as the first real external device template
5. only after that enter either:
   - the next external device template
   - or `Modbus RTU v1`

Do not skip straight from bus/device config to protocol-specific hacks.

### Smart Cleanup Review

This is the approved direction.

When deleting a block, the system should:

1. Find related auto-created helper objects.
2. Show where each object is used.
3. Let the user decide what to keep, remove, or detach.

The intended review dialog should show references such as:

- other blocks
- display widgets
- alarms
- future sequences
- signal references

The intended user actions should include:

- keep object
- delete object
- remove links but keep object

### UX Direction

The approved UX direction is:

- keep simple scenarios simple
- hide advanced complexity until needed
- move toward scenario-first setup instead of object-first setup

### Display Direction

The approved direction for local display is:

- no display-only process values
- screens bind to existing signals
- widgets only format and present state
- cleanup and where-used must later include display widget references

Recommended implementation order:

1. config schema
2. runtime structs
3. one simple rendered screen
4. signal formatting
5. multiple screens
6. navigation
7. Web UI editor

### Block Editor UX

The approved block editor rules are now captured in `docs/block-editor-ux-v1.md`.

Important points:

- commissioning users should think in actions, not internal IDs
- block IDs should be auto-generated by default
- advanced users can reach manual ID mode without making it part of the normal path
- compact row-based GPIO assistant layout is preferred over large repeated cards
- future editors should reuse the same UX pattern instead of inventing separate mini-apps

This direction is now partially implemented in `Blocks`:

- the user can start from ready-made scenarios instead of only raw block types
- the block editor can preconfigure `type + mode` from the selected scenario
- advanced internal block details are starting to move behind the more user-facing workflow

Target examples:

- button -> pulse output
- button -> toggle output
- open button / close button
- periodic pulse while enabled

This direction is now backed by a dedicated UI architecture document:

- `docs/ui-architecture-v1.md`

That document fixes the intended UI layers, registries, migration path and future-safe rules for:

- `Blocks`
- `Signals`
- future `Display`
- future `Alarms`
- future `Sequences`

### Application Template Direction

The flowmeter reference projects were reviewed and the following direction is now approved:

- domain-specific devices should become `application templates`, not separate custom firmware forks
- the first reference template to preserve is `Flowmeter`

Flowmeter ideas now explicitly captured for the platform:

- `Dashboard / Sensor Setup / Calibration / Fuel / Logs / Service` is a strong UI pattern
- live diagnostics should sit next to tuning parameters, not on a separate hidden page
- domain guidance such as "how to tune the sensor" should be built into the UI
- values such as total, daily, l/min, t/24h, density at temperature, amplitude, and signal quality should become regular signals/widgets in the platform
- calibration by known volume and fuel presets should become reusable platform concepts, not one-off code

Flowmeter density and totalizer reference corrected from local projects:

- the approved density reference is the existing piecewise `rho15 -> rhoT(temp)` model from:
  - `flowmetr_v3/flowmetr_v3.ino`
  - `flowmeter_web2/app_state.cpp`
- the earlier simplified linear density idea is not the approved model and should not be used as platform reference
- mass conversion in the reference projects is built on top of that `rhoT` result
- persistent totalization should prefer pulse-derived totals with periodic persistence, matching the reference projects, instead of storing a freely drifting floating total

This does not replace the current roadmap line.

It means the platform should eventually be able to build a flowmeter-like product from:

- resources
- signals
- blocks
- screens
- presets
- service pages

## Known UX Problems

- Too much of the UI still exposes internal engineering concepts too early.
- Some tabs are understandable to developers but still not obvious to service users.
- `Templates` remains more engineering-heavy than normal commissioning flow needs.
- `Signals` still mixes user-facing and system-facing concepts too closely.
- There is not yet a true cleanup workflow for experiments and temporary helper chains.

## Current Test 1 Status

`Test 1` is now the first live validation path for the new scenario-first direction:

- simple project shape:
  - `Button -> Timer -> Relay`
- current live entry:
  - `Автоматика -> Модули / шаблоны -> Demo: Button + Timer + Relay`

What is now already working in the wizard:

- bind existing input signal
- bind existing output channel
- create missing local `DI` channel directly from the wizard
- create missing local `DO` channel directly from the wizard
- auto-bind created `channel` back into the module
- preview generated internals before runtime materialization
- materialize generated internals into real runtime `blocks`

Current generated internals for `Test 1`:

- optional `button` block for `momentary_button`
- optional `button + latch` chain for `toggle_press`
- one real `timer` block that drives the selected output channel

Important implementation rule now confirmed by live UI:

- for the simple test path we do not force users into `Blocks` first
- the wizard starts from modules
- the wizard creates or binds missing resources
- only then it materializes generated internals

Current limitation:

- `stop_policy` is already captured in the module model and wizard
- but the current primitive timer materialization does not yet map that policy into a separate runtime helper
- this means the field is product-correct in UI, but still only partially effective in runtime behavior

`Cyclic Output Demo` correction:

- the demo no longer starts with fake `signal:*` / `channel:*` placeholder bindings
- optional bindings now start empty instead of looking invalid by default
- this keeps manual linking readable and avoids “red by preset” noise in validation

`Blank workspace` usability correction:

- the module library now shows a `Быстрый старт пустого проекта` section when the workspace is empty
- it exposes the first practical building blocks immediately:
  - `Дискретная точка / Источник`
  - `Таймер`
  - `Дискретная точка / Команда`
  - `Циклический выход`
- this removes the need to guess that the user must first open a family filter before any useful module becomes visible

Unified I/O wording correction:

- the project now explicitly treats input/output as one underlying `I/O point` model
- UI wording was adjusted so the same point can be understood as:
  - source role in a scenario
  - command/actuator role in a scenario
- separation remains useful only in scenario visualization, not as two unrelated platform objects

## Known Technical Constraints

- Data model still has hard limits such as channel/block/signal counts.
- `src/web/web.cpp` is too monolithic and should later be split.
- More runtime indirection is still string-based than ideal for long-term scale.
- Test coverage is still narrow compared with product ambition.

## Current Design Principle

The project is intentionally moving toward:

`simple on top, powerful underneath`

Meaning:

- common tasks should be solvable by guided setup
- advanced users can still reach the lower-level model
- helper objects may be auto-created
- but the system must explain ownership and dependencies clearly

## Update Rule

Whenever one of these happens, this file should be updated:

- a new runtime block is implemented
- a major UI workflow changes
- roadmap stage meaningfully advances
- a new architectural rule is approved
- cleanup/dependency logic changes
- a major risk or constraint is discovered
Latest editor visual refinement:

- the editor was visually reworked to move closer to the approved reference direction
- the main correction is not new runtime behavior, but a calmer dedicated workspace feel
- the editor now reads more like:
  - project tree on the left
  - actual state/flow workspace in the center
  - inspector and explain on the right
- instead of looking like ordinary panel cards dropped into the old UI shell
- the editor top area is now a dedicated workspace header:
  - active reference demo
  - compact state/flow mode switch
  - compact demo switch
  - visible breadcrumb
- the side columns were also made quieter and more coherent:
  - project tree is clearer
  - library groups are more compact
  - inspector cards are more focused
- the center area now better matches the product direction:
  - `State mode` for orchestration
  - `Flow mode` for node/edge logic
  - generated internals preview stays separate at the bottom
- the central editor area was then refined one step further:
  - the state view became more strip-like and less card-heavy
  - the flow view gained a compact top summary
  - links moved toward lighter edge pills instead of another heavy table/card layer
  - node cards now read more like canvas elements than generic settings cards
- the side columns were then reduced in visual weight:
  - project tree became more caption-led and compact
  - library items became smaller and less dominant
  - inspector collapsed into one calmer card instead of multiple stacked heavy panels
  - this intentionally shifts visual focus toward the center workspace
- the editor header was then compressed into a more toolstrip-like top row:
  - smaller mode switch
  - smaller demo switch
  - breadcrumb kept but visually lighter
  - summary text reduced in weight
  - result: the editor top no longer competes with the canvas as strongly
- a follow-up cosmetic pass then corrected obvious visual roughness:
  - breadcrumb no longer looks like an input field
  - side captions became calmer and less shouty
  - library entries moved closer to compact list rows instead of tile cards
  - mixed Russian/English labels in the editor shell were reduced
- a node-readability pass then improved the central canvas itself:
  - clearer node title/subtitle hierarchy
  - localized `inputs/outputs` labels
  - calmer spacing inside node cards
  - better phone-sized readability in the flow lanes
- the editor tab shell was then simplified too:
  - the old outer pilot action bar above the editor was removed
  - the editor now appears as one coherent workspace instead of a workspace inside another header/note block
  - only a quiet status line remains below it
- the first real `project_model_v2` step is now implemented in the live UI:
  - the editor no longer depends only on hardcoded demo rendering
  - reference demos are now loaded into an explicit in-memory project model
  - the editor renders from that model
  - generated internals preview is no longer placeholder-only
  - the editor now performs a first lightweight compile pass from `project_model_v2` into:
    - generated `signals`
    - generated `blocks`
    - generated `sequences`
    - generated `links`
  - this is still a UI-side preview, not backend persistence or a real runtime compiler, but the product now has a real editor-side project contract and a visible compiler direction

Latest compiler-preview step:

- `Generated internals preview` in `Автоматика -> Редактор` now renders real compiled preview data from the in-memory `project_model_v2`
- the preview currently derives:
  - source outputs as source signals
  - logic nodes as generated blocks or sequences
  - output/service nodes as command/status signals
  - edges as generated runtime links
- the preview is intentionally lightweight and reference-driven
- it is already enough to show the intended pipeline:
  - `Editor -> JSON project model -> generated internals -> existing runtime`
- `Inspector` in the editor was also cleaned up one more step:
  - node `type` now uses user-facing labels instead of raw internal strings
  - `lane` is now shown as `Роль`
- the first real editor-to-runtime bridge for `Test 1` now exists too:
  - `Редактор` can open the equivalent `Test 1` workspace in `Modules`
  - `Редактор` can also trigger `Materialize Test 1 в runtime`
  - this bridge intentionally reuses the already working `Modules` materialize path
  - it does not introduce a second divergent compiler
- current bridge behavior:
  - editor remains the main visual/project surface
  - `Modules` remains the first reusable backend for actual `Test 1` materialization
  - the editor now carries the first real node-level `bindings/params` inside `project_model_v2` for `Test 1`
  - the bridge now forwards those values into the `Modules` workspace before materialization
  - the editor preview also checks existence using the current model values instead of only hardcoded assumptions
- the next live step on top of that bridge is now implemented:
  - `Инспектор` in the editor can edit the first real `Test 1` node fields directly inside `project_model_v2`
  - current editable fields:
    - source signal
    - button profile
    - debounce
    - timer profile
    - on/off times
    - stop policy
    - output target
    - feedback
  - this means the current path is now:
    - edit in editor inspector
    - preview generated internals
    - bridge into `Modules`
    - materialize into runtime
- the next persistence slice is now implemented too:
  - `project_model_v2` is now saved in browser `localStorage`
  - editor UI state is also saved there:
    - current demo
    - current mode
    - selected node/state
    - active flow
  - current storage scope is per preset:
    - `test1`
    - `flowmeter`
    - `boiler`
  - this is browser-side persistence only
  - backend project storage is now also started:
    - the controller exposes:
      - `GET /editor-project-model?preset=...`
      - `POST /editor-project-model`
    - editor project models are now stored primarily in NVS / `Preferences`
    - old `LittleFS` editor storage is only used as legacy fallback for migration
    - this keeps editor projects separate from the uploaded Web UI image and separate from `/config.json`
  - current editor save strategy is now:
    - save locally in browser
    - debounce-save to backend
    - try backend restore on preset load / first hydration
- the next `Test 1` runtime-visibility slice is now also implemented:
  - editor-driven `materialize` now writes generated ownership metadata into saved block definitions
  - generated blocks can now be traced by:
    - `auto_generated`
    - `generated_by`
    - `generated_role`
  - `Generated internals preview` now also shows:
    - which `Test 1` runtime blocks are actually materialized
    - whether they are runtime-loaded or only config-only
    - the first service-style runtime line for:
      - timer phase
      - phase remaining
      - command active/inactive meaning
  - this is the first live point where the editor shows not only compile intent, but also post-materialize runtime semantics for `Test 1`
- the next `Test 1` usability slice is now also implemented:
  - the editor inspector now shows explicit readiness checks for:
    - source signal
    - output target
    - timer profile
    - ON time
  - the editor inspector now also includes a direct `Inspect result` section with:
    - materialize button
    - quick jumps to `Signals`, `Channels`, `Blocks`
    - current timer phase/remaining data
    - the first short operator-style service line
  - this makes the current `Test 1` path materially closer to:
    - bind
    - preview
    - materialize
    - inspect result
- the next reduction of bridge-feel is now also implemented:
  - the editor inspector can now create missing `Test 1` I/O points directly
  - the user no longer needs to jump to `Modules` just to create:
    - source DI point
    - command DO point
  - after creation, the editor immediately:
    - reloads runtime state
    - updates node bindings in `project_model_v2`
    - re-renders readiness and inspect-result data
- the next materialize step is now also implemented:
  - `Test 1` no longer needs to materialize through `Modules`
  - the editor now writes the generated runtime blocks directly via `/block-definition`
  - `Modules` remains available only as advanced/debug fallback for this path
- the next result-readability slice is now also implemented:
  - `Inspect result` now starts with a calmer operator-style service strip
  - instead of only raw runtime fields, it first answers:
    - active / waiting / idle
    - what happens next
    - how long until the next change
  - the lower-level runtime details are still present, but no longer lead the section
- the discrete-point setup path is now clearer too:
  - `Дискретная точка / Источник` now explicitly offers:
    - use existing signal
    - or create signal from a real channel
  - `Дискретная точка / Команда` now explicitly offers:
    - use existing channel
    - or create a new command channel
  - this makes the same base discrete point feel like one object with role-aware setup, instead of two unrelated UI worlds
- this role-aware setup is now also moved directly into node editing:
  - the source node itself chooses:
    - existing signal
    - or create signal from channel
  - the command node itself chooses:
    - existing channel
    - or create channel
  - this is closer to the desired “user can walk the whole Test 1 path alone” behavior
- the next `Test 1` inspector cleanup is now also implemented:
  - the separate `Готовность к materialize` card is removed
  - required fields now validate inline, directly where the user edits them
  - valid required fields are highlighted green
  - invalid required fields are highlighted red with a short reason
  - optional fields stay neutral and are not visually treated as errors
  - `OFF time` is now required only for interval-style timer profiles
- the next `Test 1` source/behavior split is now also implemented:
  - the first node is now treated as raw `Источник сигнала`
  - it outputs only:
    - `state`
  - click/double/held semantics are no longer mixed into raw `state`
  - they now live in a dedicated `Input Behavior` logic node
  - `Test 1` flow is now explicitly:
    - `Signal Source`
    - `Input Behavior`
    - `Run latch`
    - `Enable gate`
    - `Timer`
    - `Command`
  - this is much closer to real control logic than the old `button -> timer -> relay` shortcut
- the `No runtime` status is now more explicit too:
  - if required fields are still invalid, the editor says to fix the red fields first
  - if nothing is materialized yet, it says to press `Materialize`
  - if generated blocks exist but runtime did not lift them, it now says that directly instead of only `Нет runtime`
- the timer input contract is now also made explicit in `Test 1`:
  - the timer node now shows that it is driven by `logic_enable_gate.timer_enable`
  - current `Test 1` is no longer a generic timer demo
  - it is now specifically a gated cyclic timer scenario
- the source activation semantics are now also explained inline:
  - raw `state` now clearly means only the physical ON/OFF level
  - `short_press / double_press / held` are now shown as outputs of the separate behavior node
  - this removes the previous ambiguity where `state` looked like it might mean click/double/hold
- the first signal-flow trace layer is now also implemented in `Test 1`:
  - node cards now show live signal traces directly on the card
  - this includes current `IN` and `OUT` values for:
    - source
    - input behavior
    - run latch
    - enable gate
    - timer
    - command
  - edge pills now also show the current signal value/status flowing across that connection
  - this makes the editor visibly closer to the intended “logic can be followed by eye” product behavior

What this means architecturally:

- the product is now visibly pivoting away from object-first navigation as the primary experience
- `Blocks`, `Signals`, `Channels`, `Modules` still exist
- but the new main UX direction is becoming:
  - `Editor -> JSON project model -> compiler -> existing runtime`

Current limitation of this live editor slice:

- it is still a reference-backed interactive workspace, not yet a full compiler-backed project editor
- drag/drop is not implemented
- live graph editing is still limited
- generated internals preview is still intentional placeholder UX
- but this slice is now good enough to steer the next implementation steps around the right product shape

Latest runtime config storage step:

- mutable runtime/project config is now stored primarily in controller-side NVS / `Preferences`
- `/config.json` in `LittleFS` is now legacy fallback only for migration
- on successful legacy load, config is auto-migrated into NVS
- this storage path is now shared by:
  - `config_loader`
  - `web.cpp` config save/load handlers
  - `resource_manager`
  - `signal_registry`
  - `alarm_manager`
  - `sequence_manager`
  - `comms_registry`
- practical outcome:
  - `pio run -t uploadfs` should no longer overwrite the live runtime/project config
  - editor projects and runtime config are now both separated from the uploaded Web UI image
- remaining note:
  - `LittleFS` still remains valid for static UI assets and for legacy migration fallback
Latest editor correction:

- `Test 1` no longer renders as three large grouped zones that visually hide the agreed logic chain
- the flow canvas now renders the full six-block scenario explicitly:
  - `Signal Source`
  - `Input Behavior`
  - `Run latch`
  - `Enable gate`
  - `Cyclic timer`
  - `Command`
- all real links remain visible below the main chain so the user can still trace:
  - the primary left-to-right path
  - plus the additional `held -> enable gate` control link
- this correction is important because the editor is now expected to show the real signal-flow structure, not just grouped lanes
- the main chain is now rendered with visible connectors between blocks
- this moves the canvas one step closer to the approved reference direction:
  - logic should be readable from node to node
  - not only from detached pills or inspector text
- asset versioning is now forced in:
  - `index.html`
  - `app-shell.js`
- this was needed because browser caching could keep serving an old editor bundle and make the canvas appear unchanged even after UI passes were completed
- the editor now also migrates old stored `Test 1` project models
  - older saved three-node `Test 1` projects are upgraded automatically into the six-node chain
  - existing saved bindings and timer/output parameters are preserved during migration
  - the migrated model is then written back to storage so the old three-node canvas should not return on the next load
- `Test 1` node cards are now moving closer to the approved visual reference:
  - colored type headers
  - explicit node-kind badges like `INPUT / LOGIC / TIMER / OUTPUT`
  - visible input/output port lists on the cards themselves
  - stronger connector labels between steps in the main chain
- the `Test 1` cards were then reduced again:
  - narrower node width
  - smaller headers
  - denser port lists
  - more compact signal trace rows
- this keeps the editor moving away from oversized settings panels and closer to a real compact logic canvas
- the `Test 1` main chain now also has a first real wire layer:
  - SVG lines run under the nodes
  - primary links are shown as actual block-to-block wires
  - the secondary `held` path is drawn as a separate curved control wire
- the old textual connector strip was reduced so the wire layer becomes the main visual explanation
- `Input Behavior` now has real inline validation in the inspector:
  - it verifies that the source side is currently compatible with a raw discrete signal
  - it verifies `debounce_ms`
  - if the source is missing or unsupported, this now shows directly on the behavior node settings instead of failing only later at materialize time
- the next `Test 1` lifecycle step is now also started:
  - generated runtime is treated as owned by the editor-node via:
    - `auto_generated`
    - `generated_by`
    - `generated_role`
  - the editor can now discover generated runtime by owner-node, not only by hardcoded block id
  - `Input Behavior` now has its first node-level lifecycle controls:
    - `Materialize узел`
    - `Удалить runtime узла`
  - this means `logic_input_behavior_runtime` is no longer only a side effect of full-flow materialize
  - it is now the first true step-by-step runtime node in `Test 1`
- trace semantics were also tightened:
  - when downstream runtime is missing, the editor now more often says what to do next
  - for example:
    - `сначала materialize Input Behavior`
    - instead of a generic missing-runtime feeling
- `Test 1` scope is now explicitly bounded so complexity does not run away:
  - `Input Behavior v1` is limited to:
    - `click`
    - `double_click`
    - `hold`
  - future signals like:
    - `release`
    - `toggle_state`
    - `repeat`
    - richer click families
    are intentionally deferred
- the same boundary now applies to the timer side:
  - `Test 1` should move toward a more PLC-like `Cyclic Timer v1`
  - but not yet toward a full orchestration/sequence node
  - intended v1 semantics:
    - `run_request`
    - `permissive`
    - `stop_policy`
    - outputs:
      - `active`
      - `standby`
      - `phase_state`
      - `phase_remaining`
  - this boundary is important because the team explicitly wants:
  - one finished small reference first
  - then `Flowmeter`
  - then `Boiler`
  - instead of letting `Test 1` absorb all later-domain complexity
- the first concrete timer-contract move is now implemented in the editor:
  - `Enable gate` in `Test 1` was reframed into `Permissive`
  - `Timer` now reads in the editor as:
    - `run_request`
    - `permissive`
    - `active`
    - `standby`
    - `phase_state`
    - `phase_remaining`
- runtime compatibility is currently preserved through a helper strategy:
  - `Permissive` materializes its own runtime signal
  - `Timer` currently also gets an internal helper gate:
    - `logic_timer_enable_runtime`
  - that helper combines:
    - `run_request`
    - `permissive`
  - and only then feeds the existing timer primitive
- practical result:
  - editor semantics are already closer to PLC thinking
  - but the low-level timer primitive was not rewritten yet
  - so the product keeps moving without a destabilizing runtime refactor
- step-by-step runtime lifecycle now extends further than `Input Behavior`:
  - `Run latch` now also has:
    - `Materialize узел`
    - `Удалить runtime узла`
  - `Permissive` now also has:
    - `Materialize узел`
    - `Удалить runtime узла`
  - `Timer` now also has:
    - `Materialize узел`
    - `Удалить runtime узла`
- for the timer node specifically:
  - node-level materialize currently creates an owned runtime pair:
    - helper gate for `run_request AND permissive`
    - timer primitive itself
  - both are tracked under owner `logic_timer`
  - so deleting timer runtime from the editor removes both owned runtime blocks together
- the next inspector clarification is now also implemented:
  - `Run latch` no longer shows only a fixed contract text
  - it now exposes real editable source fields:
    - `Set source`
    - `Reset source`
  - `Permissive` now exposes:
    - `Permissive source`
  - `Timer` now exposes:
    - `Run request source`
    - `Permissive source`
- this is important because the user explicitly needs to see where logic is configured,
  not only what the current default contract happens to be
- those source fields are now also part of the live editor graph contract:
  - they feed validation
  - they feed node-level materialize
  - they feed whole-flow materialize
  - they feed node trace
  - they feed visual edges
- the next visual requirement is now explicit and should not be forgotten:
  - chosen upstream sources must be visible on the node ports themselves
  - edge labels should use short readable node/port names
  - the user should be able to understand the configured path from the canvas first, not only from the inspector
- one visual correction is now also explicit:
  - long source chips on canvas ports made the flow harder to read
  - the current direction is therefore:
    - keep source selection visible through wires/trace
    - use much shorter wire labels
    - avoid long text inside the compact node cards themselves
- `Test 1` still has one major visual debt:
  - the cards are still larger and heavier than the approved reference direction
  - the next passes should keep reducing the “settings panel” feeling and move closer to:
    - tighter node bodies
    - cleaner orthogonal wires from port to port
    - less trace clutter inside the canvas
