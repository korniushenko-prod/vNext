Future modular source split for config-studio.

Wave 7 `PR-19A` adds operation UI/service contracts here as a view-model layer
over the frozen metadata-first operations spine.

Wave 7 `PR-19B` adds fixture-driven read-only operation surface helpers and
fixtures on top of those contracts. This remains UI-only and metadata-only.

Wave 7 `PR-19C` adds transport contracts, guards, mappers, command intents, and
synthetic fixtures for invoke/cancel wiring. This is still transport-only:
no backend execution runtime, no target-specific hooks, no wizard flow.

Wave 7 `PR-19D` closes the generic UI/service lifecycle e2e at the front-end
boundary with synthetic lifecycle progression and focused e2e tests only.

Wave 7 `PR-19E` freezes this layer as additive-only. It stays generic,
metadata-first, and execution-neutral; backend execution belongs to Wave 8.

Wave 8 `PR-20C` wires the frozen execution baseline into this app layer only.
Runnable kinds remain limited to `reset_totalizer`, `reset_counter`, and
`reset_interval`; transport stays synthetic, and `PID autotune` remains
metadata-only.

Wave 8 `PR-20D` closes the end-to-end baseline path into this execution surface
using canonical runtime packs and target artifacts, while still avoiding real
backend execution and keeping `PID autotune` metadata-only.

Wave 8 `PR-20E` freezes this layer as a generic execution baseline only for
`reset_totalizer`, `reset_counter`, and `reset_interval`. Synthetic execution
stays canonical here, and runnable `PID autotune` moves to Wave 9.

Wave 9 `PR-21D` adds a specialized front-end service lane for runnable
`PID autotune` only. The generic operation surface remains the base layer,
while autotune gains progress payload presentation, recommendation preview,
and apply/reject confirmation flow without introducing backend execution.

Wave 9 `PR-21F` freezes that specialized autotune lane as additive-only. The
generic lifecycle and frozen Wave 8 reset lanes remain canonical underneath,
while `pid_autotune` recommendation/apply/reject handling becomes the accepted
specialized front-end boundary.

Wave 10 `PR-22E` adds a read-only package overview surface in `src/packages`
for authoring-layer package composition only. It exposes package members,
templates/presets, effective flattened objects, and boundary notes without
introducing package editing, package execution, or target transport changes.

Wave 10 `PR-22F` closes the full package path into that overview using the
canonical `BoilerPackageSkeleton v1` slice. The UI layer stays read-only and
package-neutral, while the e2e gate proves invariance from package-based
authoring through materialization and target artifact emission into the package
overview surface.

Wave 10 `PR-22G` freezes this layer as package-overview-only. Package UI stays
read-only, package-neutral, and execution-neutral; no package editor, builder,
transport, or execution controls are implied by the accepted baseline.

Wave 11 `PR-23E` adds a read-only package supervision surface in `src/packages`
on top of that frozen overview. It renders package-level summary outputs,
rollups, traces, child summary cards, and proxy operation state from canonical
fixtures only. This remains contract-driven and service-level: no backend
transport, no package execution semantics, and no package-specific engine are
introduced here.

Wave 11 `PR-23G` freezes that package supervision surface as additive-only.
`src/packages` stays read-only, contract-driven, and execution-neutral at the
package level; no package editor, backend transport, or package-specific engine
UX is implied by the accepted baseline.

Wave 12 `PR-24E` adds a read-only package coordination surface in
`src/packages` on top of the frozen package overview/supervision layers. It
renders package coordination state, summary outputs, coordination rollups,
traces, and proxy operation state from canonical fixtures only. This remains
contract-driven and service-level: no backend transport, no package execution
semantics, and no package-specific coordination engine are introduced here.

Wave 12 `PR-24G` freezes that package coordination surface as additive-only.
`src/packages` stays read-only, contract-driven, and execution-neutral at the
package level; no package editor, backend transport, or package-specific
coordination engine UX is implied by the accepted baseline.

Wave 13 `PR-25E` adds a read-only package mode / phase surface in
`src/packages` on top of the frozen package overview/supervision/coordination
layers. It renders active mode / phase, mode summaries, phase summaries,
groups, traces, and package links from canonical fixtures only. This remains
contract-driven and service-level: no backend transport, no package execution,
and no hidden sequencing engine are introduced here.

Wave 13 `PR-25G` freezes that package mode / phase surface as additive-only.
`src/packages` stays read-only, contract-driven, and execution-neutral at the
package level; no package editor, backend transport, package execution, or
package-specific sequencing UX is implied by the accepted baseline.

Wave 14 `PR-26E` adds a bounded package mode / phase execution surface in
`src/packages` on top of the frozen package overview/supervision/coordination
and mode/phase layers. It renders active transition lane, allowed transition
actions, guard badges, and request previews from canonical fixtures only. This
remains contract-driven and service-level: no backend transport, no real
package execution runtime, and no package-specific sequence engine are
introduced here.

Wave 14 `PR-26G` freezes that package mode / phase execution surface as
additive-only. `src/packages` stays read-only, contract-driven, and
package-neutral at the execution boundary; no package editor, backend
transport, safety wizard, or full sequence runtime UX is implied by the
accepted baseline.

Wave 15 `PR-27E` adds a read-only package permissive / interlock surface in
`src/packages` on top of the frozen package package overview, supervision,
coordination, mode/phase, and bounded execution layers. It renders gate
summary, gate entries, reason lists, transition guards, summary outputs,
rollups, and traces from canonical fixtures only. This remains contract-driven
and service-level: no editing, no overrides, no safety workflow, and no
package execution are introduced here.

Wave 15 `PR-27G` freezes that package permissive / interlock surface as
additive-only. `src/packages` stays read-only, contract-driven, package-neutral,
and non-safety at the package gate boundary; no package editor, backend
override transport, safety wizard, or package-specific execution UX is implied
by the accepted baseline.

Wave 16 `PR-28E` adds a read-only package protection / recovery surface in
`src/packages` on top of the frozen package overview, supervision,
coordination, mode/phase, bounded execution, and permissive/interlock layers.
It renders protection summary, trips, inhibits, recovery requests, diagnostic
summaries, summary outputs, rollups, and traces from canonical fixtures only.
This remains contract-driven and service-level: no package editor, no safety
wizard, no backend recovery transport, and no package execution are introduced
here.

Wave 16 `PR-28G` freezes that package protection / recovery surface as
additive-only. `src/packages` stays read-only, contract-driven, package-neutral,
and explicitly non-safety at the package protection boundary; no package
editor, backend recovery workflow, safety runtime UX, or package-specific
execution semantics are implied by the accepted baseline.

Wave 17 `PR-29E` adds a read-only package arbitration surface in `src/packages`
on top of the frozen package overview, supervision, coordination, mode/phase,
bounded execution, permissive/interlock, and protection/recovery layers. It
renders ownership summary, command summary, ownership lanes, command lanes,
summary outputs, rollups, and traces from canonical fixtures only. This remains
contract-driven and service-level: no package command transport, no package
execution runtime, and no vendor-specific command engine are introduced here.

Wave 17 `PR-29G` freezes that package arbitration surface as additive-only.
`src/packages` stays read-only, contract-driven, package-neutral, and
execution-neutral at the package command boundary; no package editor, backend
command workflow, override transport, or package-specific execution semantics
are implied by the accepted baseline.

Wave 18 `PR-30E` adds a read-only package override / handover surface in
`src/packages` on top of the frozen package overview, supervision,
coordination, mode/phase, bounded execution, permissive/interlock,
protection/recovery, and arbitration layers. It renders holder summary,
bounded handover requests, summary outputs, rollups, and traces from canonical
fixtures only. This remains contract-driven and service-level: no package
handover transport, no backend execution runtime, and no vendor-specific
ownership engine are introduced here.

Wave 18 `PR-30G` freezes that package override / handover surface as
additive-only. `src/packages` stays read-only, contract-driven,
package-neutral, execution-neutral, and non-safety at the package override
boundary; no package editor, handover wizard, backend transport, or
package-specific execution semantics are implied by the accepted baseline.

Pilot Track `PR-31E` adds the first production-like commissioning surface in
`src/packages` for `PumpSkidSupervisor v1`. This surface is still bounded:
package state, configuration/apply summary, readback status, live signals,
ownership/gating/protection summaries, and diagnostics are accepted, while a
generic HMI editor, fleet orchestration, and broad target transport remain out
of scope.

Hardware Catalog Track `PR-H3` adds a read-only hardware preset surface in
`src/hardware` for the frozen LilyGO and ESP32-C3 lanes. It stays fixture-
driven and authoring-only: preset choice, chip/board summary, reserved pins,
forbidden pins, resources, and manifest diagnostics are visible without edit
actions or target transport.

Hardware Catalog Track `PR-H4` adds an editable hardware manifest surface in
`src/hardware` on top of that read-only lane. It supports target preset
selection, resource GPIO override editing, conflict preview, and manifest save
into the current project model while staying bounded, target-neutral, and
authoring-only.
