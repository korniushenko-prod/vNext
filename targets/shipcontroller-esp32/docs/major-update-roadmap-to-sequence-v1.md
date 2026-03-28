# Major Update Roadmap To Sequence v1

## Purpose

This document defines one long execution path from the current state of the platform up to the first usable `Sequence Engine v1`.

It exists so implementation can continue phase by phase without re-planning from scratch and without unnecessary questions each time.

The goal is not to do everything at once.

The goal is to keep one large delivery line stable and predictable.

## Structural Principle

This roadmap is built from two layers:

1. delivery phases
2. cross-cutting support tracks

The delivery phases define what functional capability is added next.

The support tracks define what must quietly mature in parallel so later phases do not collapse under their own weight.

This means the platform should not be treated as:

- just a list of new features

It should be treated as:

- a controlled sequence of features
- supported by a small set of shared structural tracks

## Working Rule

Execution should follow this roadmap in order.

Do not jump ahead unless:

- the current phase is blocked by hardware or architecture
- the next phase depends on a small enabling change
- the change is written back into project docs

If a phase can move forward with safe assumptions, proceed without asking open-ended questions.

If a decision has hidden consequences, record the assumption and continue conservatively.

## Approved Long-Run Order

1. `External Analog UX Pack v1`
2. `Device Template Pattern v1`
3. `External DAC v1`
4. `Modbus RTU v1`
5. `Alarm v1`
6. `Alarm UX / Service Pack v1`
7. `Logic Helper Pack v1`
8. `Sequence Foundation v1`
9. `Sequence Engine v1`

After that:

10. full UI revision pass
11. sequence-first visual editor direction and first mechanism-authoring phase
12. satellites and dedicated test bench phase

The UI revision pass is now explicitly structured by:

- `docs/full-ui-review-plan-v1.md`

The future visual-editor direction is explicitly structured by:

- `docs/visual-editor-strategy-v1.md`
- `docs/functional-module-model-v1.md`

The future authoring/model direction above the current engine is explicitly structured by:

- `docs/functional-module-model-v1.md`
- `docs/module-runtime-contract-v1.md`
- `docs/sequence-contract-v1.md`

For the new module-first authoring layer above the current engine, the immediate execution order after the current skeleton is now explicitly:

1. formalize `module runtime contract`
2. formalize `sequence contract`
3. build `validation/status layer for modules and links`
4. build `flow view v1`

## Cross-Cutting Support Tracks

These tracks do not replace the main delivery phases.

They run alongside them and should advance whenever the current phase touches them.

### Support Track A: Config Versioning And Migration

Why:

- later device templates, DAC, Modbus, alarms and sequences will keep changing config shape
- silent config breakage would become one of the highest project risks

Minimum direction:

- explicit config schema version
- migration helper path
- safe defaults for newly introduced fields
- written migration notes when structure changes

Working rule:

- every phase that changes config shape should be migration-aware

### Support Track B: Compile-Time Feature Flags

Why:

- the platform is growing faster than one universal binary should
- `LilyGO T3` is a practical main target, but flash discipline is now mandatory

Minimum direction:

- optional subsystem flags
- avoid linking features a target does not need

Priority candidates:

- `LoRa`
- `OLED/Display`
- `Comms`
- later `Modbus`

Working rule:

- when flash pressure rises, reduce optional features before redesigning the platform

### Support Track C: Final Stabilization And Review

Why:

- the current agreed pace prioritizes functional growth first
- the user wants one large review and correction pass later instead of a parallel test-first flow now

Minimum direction:

- full UI review
- regression review
- config compatibility review
- memory review
- cross-feature integration review

Working rule:

- this track is intentionally deferred
- it should return as a dedicated stabilization phase after the current major functional pack is advanced further

### Support Track D: Event And History Layer

Why:

- `Alarm v1` and `Sequence Engine v1` need more than raw current values
- operators and service screens need transitions, acknowledgements and recent events

Minimum direction:

- lightweight event model
- recent event list or ring buffer
- event types for:
  - alarm activation/reset/ack
  - sequence state changes
  - comm loss/recovery

Working rule:

- this does not need to become a heavy historian before `Sequence`
- but the basic event shape should exist before deep alarm and sequence UX

### Support Track E: Text/State Presentation

Why:

- later display, alarms and sequences need more than numeric and boolean values
- the UI and OLED will need stable text sources for state and status

Minimum direction:

- state/status text sources
- source labels
- sequence/alarm/user-facing names

Working rule:

- avoid inventing one-off text hacks in each subsystem

## Phase 1: External Analog UX Pack v1

Goal:

- make external analog as understandable as local analog

Scope:

- better `Comms` editor flow
- driver-aware notes
- quick resource seeding
- clearer `Channels` source and preview
- easier `Display` binding for external analog signals

Stage gate:

- external analog can be commissioned without guessing
- while advancing this phase, also advance:
  - Support Track A where config shape changes
  - Support Track B if flash grows

## Phase 2: Device Template Pattern v1

Goal:

- create one repeatable way to add external device templates

Scope:

- driver-specific device fields
- driver-specific notes
- driver-specific quick actions
- shared backend persistence pattern
- no special-case channel logic

Stage gate:

- a new external device template can be added without inventing a new flow
- while advancing this phase, also advance:
  - Support Track A
  - Support Track B

## Phase 3: External DAC v1

Goal:

- add the first real external DAC through the same shared model

Recommended first target:

- `MCP4728`

Scope:

- DAC device template
- external `analog_out` resources
- `AO` binding path
- engineering value path
- runtime/status visibility

Stage gate:

- external analog output can be configured and driven through the shared device/resource/channel/signal model
- while advancing this phase, also advance:
  - Support Track A
  - Support Track B

## Phase 4: Modbus RTU v1

Goal:

- add the first protocol-backed external device class

Scope:

- RS485 bus usage through shared bus model
- Modbus device template
- register/coil style external resources
- polling and quality/status
- basic import/export mapping into channels/signals

Stage gate:

- the platform can read and write a useful set of Modbus-backed resources without breaking the shared model
- while advancing this phase, also advance:
  - Support Track A
  - Support Track B
  - begin Support Track D where practical

Current implementation start:

- `modbus_rtu` template exists in `Comms`
- first serial/RS485 transport groundwork exists
- the external-resource editor already has quick Modbus resource profiles for:
  - `Input Reg AI`
  - `Holding Reg AO`
  - `Discrete In DI`
  - `Coil DO`
- the device editor can now launch those resource profiles directly as prefilled new resources
- direct commissioning write already covers:
  - `register / ao`
  - `coil / do`
- `Comms` tables now also show human-readable Modbus resource types and read/write function profile
- first single-resource read/write semantics exist for:
  - register/input-register
  - register/holding-register
  - coil/discrete-input
  - coil/writeable-coil
- this phase is now considered done enough to move forward:
  - transport/resource/channel integration exists
  - commissioning shortcuts exist
  - direct AO/DO write path exists
  - human-readable `Comms` presentation exists

## Phase 5: Alarm v1

Goal:

- build the first proper alarm layer on top of stable local and external engineering signals

Scope:

- alarm source signal
- threshold/condition
- severity
- delay
- latch
- acknowledge
- inhibit / enable
- active state

Stage gate:

- active alarms can be generated from real signals and survive practical commissioning scenarios
- while advancing this phase, also advance:
  - Support Track D
  - Support Track E

Current implementation start:

- first runtime manager now exists for:
  - source signal
  - optional enable/inhibit signal
  - severity
  - delay
  - latch
  - acknowledge-required behavior
- runtime is updated as part of the normal system cycle
- a lightweight recent-event ring buffer now exists for:
  - `active`
  - `ack`
  - `clear`
- Web API now exposes:
  - `GET /alarms`
  - `POST /alarm`
  - `POST /alarm-delete`
  - `POST /alarm-ack`
- the file-based UI now has a first `Alarms` tab with:
  - summary cards
  - active alarm list
  - all alarms list
  - recent events
  - simple editor
- this first slice intentionally stays narrow and uses binary source signals only

## Phase 6: Alarm UX / Service Pack v1

Goal:

- make alarms usable for real operators and commissioning work

Scope:

- active alarm list
- acknowledge actions
- clear alarm status and state text
- simple history or recent event list
- display binding for alarm summary
- service visibility in Web UI

Stage gate:

- alarms are not only present in runtime but also understandable and actionable in UI
- while advancing this phase, also advance:
  - Support Track D
  - Support Track E

Current implementation start:

- alarm summary is now also available as lightweight display/system sources:
  - `system.alarm_active_count`
  - `system.alarm_pending_count`
  - `system.alarm_unacked_count`
  - `system.alarm_latest`
  - `system.alarm_latest_severity`
  - `system.alarm_latest_status`
- the `Alarms` tab now has a first operator/service readability pass:
  - filter for active, unacked, critical, warning, all
  - clearer severity/status/ack pills
  - richer summary cards for pending and unacked alarms
  - recent-event presentation aligned with the same visual status language

## Phase 7: Logic Helper Pack v1

Goal:

- add the missing reusable helpers between today's blocks and tomorrow's real scenarios

Scope:

- `AND / OR / NOT / XOR`
- edge / one-shot trigger helper
- hysteresis / deadband helper
- scheduler / calendar gating helper
- permissive / inhibit / interlock helpers
- mode / authority helper for:
  - local
  - remote
  - auto
  - manual
  - service
- heartbeat / freshness / comm-loss helper for external devices and satellites

Stage gate:

- practical scenario authoring no longer depends on awkward timer/latch/comparator workarounds
- the platform has the minimum logic vocabulary needed before state-machine work

Current implementation start:

- first helper slice is now in place through `logic_gate`
- implemented modes:
  - `and`
  - `or`
  - `not`
  - `xor`
- the block is already wired into runtime, config persistence, cleanup references and Web UI editing
- second helper slice is now in place through `edge_detect`
- implemented modes:
  - `rising`
  - `falling`
  - `both`
- it publishes a short pulse on selected signal edges and is intended as a clean bridge between level logic and sequence transitions
- third helper slice is now in place through `hysteresis`
- implemented modes:
  - `high`
  - `low`
  - `outside_band`
  - `inside_band`
- it turns noisy analog or numeric signals into stable binary results using threshold hysteresis or a deadband zone
- fourth helper slice is now in place through `interlock`
- implemented modes:
  - `permissive`
  - `inhibit`
  - `interlock`
- it is intentionally signal-first:
  - optional `request` input
  - `permissive` input
  - `inhibit/interlock` input
  - one clean binary result for the next block, alarm or sequence transition
- this block is meant to reduce awkward ad hoc chains before real sequence authoring
- fifth helper slice is now in place through `mode_authority`
- implemented modes:
  - `local_remote`
  - `local_remote_service`
  - `auto_manual`
  - `auto_manual_service`
- it is intentionally signal-first:
  - primary source signal
  - secondary source signal
  - optional service source signal
  - mode-select signal
  - one selected output signal plus dependent mode-status signals
- it is meant to keep local/remote and auto/manual ownership logic out of fragile ad hoc selector chains before real sequence authoring
- sixth helper slice is now in place through `freshness`
- implemented modes:
  - `fresh`
  - `stale`
  - `comm_loss`
- it is intentionally signal-first:
  - monitored signal
  - timeout
  - one clean binary result
- it is meant to keep comm-loss and stale checks out of fragile ad hoc comparator/timer chains before real sequence authoring

## Phase 8: Sequence Foundation v1

Goal:

- establish the shared model required for sequence/state-machine control before full execution logic grows

Architectural rule:

- sequence should be a first-class runtime layer, not a macro that expands into many ordinary timer/latch/helper blocks
- sequence may depend on existing signals and helper blocks
- but its own orchestration state should primarily be exposed as auto-created sequence-owned signals

Preferred internal model:

- sequence consumes signal IDs only
- sequence actions target existing channels or published command/status signals
- sequence creates dependent service/status signals automatically
- sequence editor remains the source of truth for those dependent signals

Typical dependent signals:

- `sequence.running`
- `sequence.ready`
- `sequence.done`
- `sequence.fault`
- `sequence.current_step`
- `sequence.step_<name>_active`
- `sequence.transition_ready`
- `sequence.time_in_step`
- `sequence.waiting_reason`

Non-goal for v1:

- do not make sequence auto-create physical channels
- channels remain explicit physical or external resources
- only sequence-owned runtime/helper signals should be auto-managed by the sequence layer

Scope:

- sequence config model
- state model
- transition model
- per-state timers
- permissives
- trips / lockouts
- manual/service transitions
- sequence runtime signals

This phase should define the shape of:

- `sequence`
- `state`
- `transition`
- `action`
- `permissive`
- `trip`

Stage gate:

- sequences can be described in config/runtime terms without ad hoc hacks
- while advancing this phase, also advance:
  - Support Track A
  - Support Track D
  - Support Track E

Current implementation start:

- `SequenceManager` is now implemented as a first-class runtime layer
- sequence definitions are now loaded from `/config.json`
- sequence config/runtime already supports:
  - sequence-level enable/start/trip/reset
  - state definitions
  - transition definitions
  - per-state permissive
  - per-state timeout
  - per-transition delay and invert
  - sequence-owned dependent signals
- sequence references are already integrated into cleanup/where-used
- the first working `Sequences` Web UI tab is now in place
- display/service presentation already exposes sequence summary through `system.sequence_*` sources

## Phase 9: Sequence Engine v1

Goal:

- execute real state-machine logic for mechanisms

Scope:

- state entry/exit
- transition evaluation
- timers per state
- actions per state
- permissive and trip handling
- restart behavior
- manual/service operations
- display/status integration

Target use cases:

- pump/tank sequence
- purge/startup/shutdown flow
- auxiliary machinery routines

Stage gate:

- one non-trivial mechanism can be modeled as a sequence instead of a fragile block chain
- while advancing this phase, also advance:
  - Support Track D
  - Support Track E

Current implementation start:

- runtime execution already supports:
  - state entry
  - transition evaluation
  - per-state timeout handling
  - delay-based transitions
  - trip/reset behavior
  - simple state actions targeting channels or published signals
- recent sequence events are already stored in a lightweight ring buffer
- the current active work should now focus on:
  - service-facing presentation
  - first non-trivial real sequence scenarios and reusable sequence templates
- first reusable authoring slice now in place:
  - `actuator start / wait feedback / run / fault` template seeding through the standard sequence editor/API path
- first sequence authoring/runtime polish slice now in place:
  - richer waiting/fault/detail reasons in runtime
  - pending transition timing visibility
  - sequence reason/transition sources exposed to display/service UI
- first sequence action-semantics slice now in place:
  - explicit action targets:
    - plain `id`
    - `channel:<id>`
    - `signal:<id>`
    - `command:<id>`
  - sequence editor now explains that syntax directly in the state action area
- first config-versioning slice now in place:
  - top-level `config_version`
  - supported schema version constant
  - loader warning for older/newer configs
  - save path always rewrites the current version
  - runtime exposes current/supported version for service visibility
- `feature flags skeleton` is now also in place:
  - shared compile-time flags:
    - `FEATURE_LORA`
    - `FEATURE_OLED`
    - `FEATURE_COMMS`
    - `FEATURE_MODBUS`
  - default full profile:
    - `env:esp32dev`
  - first lighter profile:
    - `env:esp32dev_minimal`
  - LoRa/OLED/runtime comms paths now compile as safe stubs when disabled
  - runtime now exposes build-time feature availability for service/UI
- `system source registry cleanup` is now also in place:
  - `system.*` ids and labels now live in one shared runtime registry
  - runtime/service UI now exposes that registry through `/runtime`
  - display source selection now consumes runtime-provided system-source metadata instead of a duplicated frontend list
- `one mature real sequence template` is now also in place:
  - the actuator starter seed is now upgraded to a reusable `actuator + feedback` pattern
  - it seeds:
    - `start_cmd`
    - `run`
    - `done`
    - `fault`
  - it now models:
    - start
    - feedback confirmation
    - stop-to-done
    - feedback-loss fault
  - this means the upcoming UI review can now inspect a real mechanism-style flow instead of only abstract sequence editing
- agreed stabilization order before the full UI review:
  1. `Sequence action semantics`
  2. `config_version + migration rule`
  3. `feature flags skeleton`
  4. `system source registry cleanup`
  5. `one mature real sequence template`
  6. `full UI review`

## Explicit Non-Goals During This Pack

Do not interrupt this line for:

- many unrelated new ADC drivers
- satellite firmware work
- dedicated test bench implementation
- full CAN/TWAI stack
- heavy visual drag-and-drop editors
- broad alarm trees before `Alarm v1` is done

Those can return after this roadmap reaches the agreed stopping point.

## Immediate Start Point

The current implementation should start from:

1. `External Analog UX Pack v1`

But it should do so with explicit awareness of:

- Support Track A: config migration mindset
- Support Track B: feature flags and flash discipline

And before `Alarm v1` or `Sequence` it should also establish:

- Support Track D: event/history basics
- Support Track E: text/state presentation basics

The final stabilization/review track is intentionally deferred and should return later as a focused cleanup phase.
