# config-studio

Initial vNext authoring application shell migrated from `universal_plc`.

## Current state
- static HTML/CSS/JS baseline lives in `public/`
- this is a migration checkpoint, not the final modular app structure
- canonical shared contracts already live in `/packages`

## Next migration steps
- start replacing inline model/types logic with imports aligned to shared packages
- split project model, materialization, and app surface concerns
- keep runtime integration out of the app layer

## Wave 7 baseline
- Wave 7 starts from the frozen Wave 6 operations spine
- config-studio owns only UI/service contracts and view-model mapping in `src/operations/contracts`
- operation execution, target hooks, and wizard logic stay out of scope in `PR-19A`
- `PR-19B` adds a fixture-driven read-only operation surface in `public/`
- invoke/cancel transport, execution hooks, and wizard flows remain out of scope

## Wave 7 transport boundary
- `PR-19C` adds invoke/cancel transport wiring only inside `config-studio`
- transport stays browser/service-side and synthetic in this phase
- no runtime backend, no WebSocket/SSE orchestration, no target-specific imperative hooks
- confirmation gating is contract-driven only; execution lifecycle remains out of scope

## Wave 7 lifecycle closure
- `PR-19D` closes the generic UI/service lifecycle end-to-end inside `config-studio`
- canonical operation surfaces now cover pending, running, completed, failed, cancelled, unsupported, and no-snapshot degradation
- `PID autotune` remains metadata-only and passes through the same generic lifecycle lane

## Wave 7 freeze note
- `PR-19E` freezes Wave 7 as a generic UI/service lifecycle baseline
- Config Studio remains metadata-first and execution-neutral on this frozen baseline
- synthetic transport and synthetic lifecycle progression are canonical here, not backend execution
- Wave 7 is additive-only beyond bugfixes
- real execution work opens only in Wave 8

## Wave 8 execution baseline
- `PR-20C` wires the frozen execution baseline only inside `config-studio`
- only `reset_totalizer`, `reset_counter`, and `reset_interval` are treated as runnable kinds
- invoke/cancel stays synthetic and contract-driven; no backend execution is introduced here
- `PID autotune` and other non-baseline operations remain metadata-only on the UI surface

## Wave 8 e2e closure
- `PR-20D` closes the full baseline path from canonical projects through runtime/target artifact snapshots into the `config-studio` execution surface
- canonical slices are `PulseFlowmeter + reset_totalizer`, `RunHoursCounter + reset_counter`, and `MaintenanceCounter + reset_interval`
- the combined execution demo keeps `no_snapshot`, `pending`, `running`, `completed`, `failed`, and `unsupported_by_target` lanes visible without introducing real backend execution

## Wave 8 freeze note
- `PR-20E` freezes Wave 8 as a generic execution baseline inside `config-studio`
- only `reset_totalizer`, `reset_counter`, and `reset_interval` remain runnable on this baseline
- synthetic transport and synthetic lifecycle remain canonical here; no real backend execution is introduced
- `PID autotune` remains metadata-only and does not receive a special execution lane in Wave 8
- Wave 9 is the first allowed phase for runnable PID autotune execution

## Wave 9 autotune surface
- `PR-21D` adds a specialized `PID autotune` service lane on top of the frozen generic operation surface
- generic operation cards, transport wiring, and degraded states remain canonical
- autotune now presents progress payload, recommendation preview, and apply/reject confirmation flow
- transport remains synthetic and browser-side only; no backend execution runtime is introduced here

## Wave 9 freeze note
- Wave 9 is frozen here as a specialized autotune UI/service lane on top of the generic surface
- generic reset execution lanes from Wave 8 remain unchanged
- `pid_autotune` recommendation/apply/reject flow is canonical here
- transport remains synthetic and browser-side only in this baseline

## Wave 10 package overview
- `PR-22E` adds a read-only package overview inside `config-studio`
- the app now exposes package title/id, member composition, template/preset summary, effective flattened objects, and package boundary notes on fixtures
- package editing, drag/drop builders, package execution controls, and target transport changes remain out of scope

## Wave 10 package e2e closure
- `PR-22F` closes the first full package path into the read-only package overview
- canonical path is `Package-based ProjectModel -> materializeProject() -> RuntimePack -> checkEsp32Compatibility() -> emitShipControllerConfigArtifact() -> config-studio package overview`
- the accepted slice is `BoilerPackageSkeleton v1`, and it remains package-neutral after flattening and target emission

## Wave 10 freeze note
- Wave 10 freezes the package surface as read-only authoring/package inspection only
- package overview remains package-neutral and execution-neutral
- no package editor, package builder, package transport, or package execution controls are implied by this baseline
- `BoilerPackageSkeleton v1` remains a supervisory skeleton only

## Wave 11 package supervision surface
- `PR-23E` adds a read-only package supervision surface on top of the frozen package overview
- Config Studio now renders package-level summary outputs, rollups, trace groups, child summary cards, and proxy operation state from package supervision fixtures
- this surface stays contract-driven, service-level, and target-neutral; it does not introduce backend transport or package execution semantics

## Wave 11 freeze note
- Wave 11 freezes package supervision in `config-studio` as a read-only service surface only
- the accepted UI boundary is summary outputs, rollups, traces, child cards, and proxy operation state over already frozen child lanes
- no package editor, package execution controls, backend transport, or package-specific engine UX is implied by this freeze

## Wave 12 package coordination surface
- `PR-24E` adds a read-only package coordination surface on top of the frozen package overview and package supervision layers
- Config Studio now renders package coordination snapshot state, summary outputs, coordination rollups, traces, and proxy operation state from canonical fixtures
- this surface stays contract-driven, service-level, and target-neutral; it does not introduce backend transport or package execution semantics

## Wave 12 freeze note
- Wave 12 freezes package coordination in `config-studio` as a read-only service surface only
- the accepted UI boundary is package state summary, coordination rollups, traces, and proxy operation state over already frozen child lanes
- no package editor, package execution controls, backend transport, or package-specific coordination engine UX is implied by this freeze

## Wave 13 package mode / phase surface
- `PR-25E` adds a read-only package mode / phase surface on top of the frozen package overview, supervision, and coordination layers
- Config Studio now renders active mode/phase, mode summaries, phase summaries, groups, and trace-group rollups from canonical fixtures
- this surface stays contract-driven, service-level, and target-neutral; it does not introduce backend transport, package execution, or hidden sequencing semantics

## Wave 13 freeze note
- Wave 13 freezes package mode / phase in `config-studio` as a read-only service surface only
- the accepted UI boundary is active mode/phase, summary entries, groups, traces, and package links over already frozen child lanes
- no package editor, package execution controls, backend transport, or package-specific sequencing engine UX is implied by this freeze

## Wave 14 package mode execution surface
- `PR-26E` extends the frozen package mode / phase surface with bounded package transition cards, active transition lane summary, guard state badges, and request preview only
- the UI remains generic and package-neutral across both boiler-like and non-boiler reference slices
- backend transport, real package execution, sequence builders, and domain-specific wizards remain out of scope

## Wave 14 freeze note
- Wave 14 freezes the package mode / phase execution surface as a bounded, synthetic UI/service layer only
- accepted lifecycle vocabulary stays limited to pending, running, completed, failed, and cancelled over bounded transition requests
- no package editor, backend transport, safety UI, or full sequence runtime UX is implied by this freeze

## Wave 15 package permissive/interlock surface
- `PR-27E` adds a read-only package permissive/interlock surface on top of the frozen package overview/supervision/coordination/mode layers
- Config Studio now renders package gate summary, gate entries, reason lists, transition guards, summary outputs, rollups, and traces from canonical fixtures only
- this surface stays contract-driven and service-level: no editing, no overrides, no safety workflow, and no package execution are introduced here

## Wave 15 freeze note
- Wave 15 freezes the package permissive/interlock surface as a read-only, generic package gating layer only
- accepted UI vocabulary stays limited to ready, blocked, held, faulted, unsupported, and no-snapshot package gate states
- no package editor, safety wizard, backend override transport, or package-specific execution UX is implied by this freeze

## Wave 16 package protection/recovery surface
- `PR-28E` adds a read-only package protection/recovery surface on top of the frozen package overview/supervision/coordination/mode/gate layers
- Config Studio now renders protection summary, trips, inhibits, recovery requests, summary outputs, rollups, traces, and diagnostic summaries from canonical fixtures only
- this surface stays contract-driven, generic, and explicitly non-safety: no package editor, no recovery wizard, and no backend execution are introduced here

## Wave 16 freeze note
- Wave 16 freezes the package protection/recovery surface as a read-only, generic, non-safety package layer only
- accepted UI vocabulary stays limited to ready, blocked, tripped, recovering, unsupported, and no-snapshot package protection states
- no package editor, safety wizard, backend recovery workflow, or package-specific execution UX is implied by this freeze

## Wave 17 package arbitration surface
- `PR-29E` adds a read-only package arbitration surface on top of the frozen package overview/supervision/coordination/mode/gate/protection layers
- Config Studio now renders ownership summary, command summary, ownership lanes, command lanes, summary outputs, rollups, and traces from canonical fixtures only
- this surface stays contract-driven, generic, and execution-neutral: no package command transport or backend execution is introduced here

## Wave 17 freeze note
- Wave 17 freezes the package arbitration surface as a read-only, generic, package-neutral layer only
- accepted UI vocabulary stays limited to accepted, blocked, denied, superseded, unsupported, and no-snapshot package arbitration states
- no package editor, command override workflow, backend transport, or package-specific execution UX is implied by this freeze

## Wave 18 package override/handover surface
- `PR-30E` adds a read-only package override / handover surface on top of the frozen package overview/supervision/coordination/mode/gate/protection/arbitration layers
- Config Studio now renders holder summary, bounded handover requests, summary outputs, rollups, and traces from canonical fixtures only
- this surface stays contract-driven, generic, and execution-neutral: no package handover transport or backend execution is introduced here

## Wave 18 freeze note
- Wave 18 freezes the package override / handover surface as a read-only, generic, package-neutral layer only
- accepted UI vocabulary stays limited to accepted, blocked, denied, unsupported, and no-snapshot package override / handover states
- no package editor, handover wizard, backend transport, or package-specific execution UX is implied by this freeze

## Pilot track note
- `PumpSkidSupervisor v1` is the first production-like pilot package surfaced in `config-studio`
- the app now includes a bounded commissioning surface for package state, template/preset summary, binding summary, apply result, readback status, live signals, and commissioning diagnostics
- this does not reopen generic package execution, SCADA/HMI editing, or broad target transport orchestration

## Hardware preset catalog note
- `PR-H3` adds a read-only hardware preset surface for the frozen LilyGO and ESP32-C3 target lanes
- the app now shows selected target preset, chip/board summary, reserved pins, forbidden pins, available resources, and manifest diagnostics from canonical fixtures
- `PR-H4` adds an editable hardware manifest lane inside the existing authoring shell only: target preset selection, resource GPIO overrides, conflict preview, and manifest save into the current project model
- this remains authoring-only and conflict-first: no target transport, no runtime Wi-Fi/display editor, and no broad target-config workspace are introduced here

## Hardware preset catalog freeze note
- the hardware preset / target catalog track is frozen here as a bounded authoring-only surface
- canonical preset support remains limited to the LilyGO T3 and ESP32-C3 reference lanes
- readonly preset overview and editable manifest save are the accepted UI boundary for this track
- no live board probing, no transport orchestration, and no generic target-config editor are implied by this freeze
