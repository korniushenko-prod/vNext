# Controller-Hosted Editor Unification Roadmap

## Why this document exists

`vNext` now has two strong but incomplete frontend realities:

- `apps/editor-web` contains the new machine-first authoring model
- `targets/shipcontroller-esp32/data` contains the real controller-hosted commissioning UI

Keeping both as long-term equal products would create a fragmented engineering
experience and duplicate frontend effort.

The product decision fixed by this document is:

- there will be one main engineering editor
- that editor will be hosted by the controller
- `apps/editor-web` becomes the canonical frontend source
- the legacy `shipcontroller` UI is migrated into that shell by workspace

This is not a third UI initiative.
It is a unification initiative.

## Product outcome

The final user experience should feel like:

1. open the controller in a browser
2. choose board, chip, network and display
3. create or open a machine composition
4. bind logical ports to real I/O
5. verify live runtime truth
6. preview materialization
7. apply to the controller

The user should not need to think in terms of:

- separate editor app
- separate runtime service UI
- separate export utility

## Engineering principles

### 1. One shell

There is one consistent shell with:

- top bar
- left project/navigation rail
- center workspace
- right inspector
- bottom trace strip

### 2. Four primary workspaces

The main engineering flow is organized around:

- `Machine`
- `Logic`
- `Bind`
- `Observe`

Global build actions live in the shell:

- `Validate`
- `Build`
- `Preview Runtime`
- `Apply`

### 3. Forms are secondary

The center of gravity is always the main workspace canvas or board/resource map.

Forms belong in the right inspector by default.

### 4. Stable commissioning path first

The first production requirement is a stable device commissioning flow.

That means `Bind` and `Observe` must remain reliable even while richer
authoring surfaces continue evolving.

### 5. Controller-hosted source of truth for deployment

The project model remains the semantic source of truth.

The controller-hosted editor becomes the operational source of truth for:

- deployment
- board/chip selection
- hardware binding
- runtime preview
- apply/download

## Workspace roles

### Machine

Purpose:

- build machine compositions from objects and nested objects
- define public contracts
- navigate hierarchy

Primary center surface:

- graph canvas

### Logic

Purpose:

- define signal interpretation and neutral behavior blocks
- comparators
- timers
- selectors
- gates
- interlocks

Primary center surface:

- typed logic graph

### Bind

Purpose:

- select controller, board and chip
- assign physical I/O
- validate pin/resource conflicts
- test outputs quickly

Primary center surface:

- board map
- resource map
- quick bind flow

### Observe

Purpose:

- runtime truth
- active network state
- live values
- alarms
- OLED preview
- trace and diagnostics

Primary center surface:

- runtime overview panels

## Legacy surface mapping

Legacy `shipcontroller` surfaces should be migrated by role, not copied tab for
tab.

### Move into Bind

- `Network`
- `Hardware`
- `Channels`

### Move into Logic

- `Signals`
- `Blocks`

### Move into Machine

- `Editor`
- `Sequences`
- `Templates`

### Move into Observe

- `Overview`
- `Diagnostics`
- `Display preview`
- `Request trace`

### Move into Advanced

- raw JSON/debug panels
- deep protocol tools
- rare service/recovery tools
- comms detail tables until a dedicated UX exists

## Target shell layout

### Top bar

Shows:

- project name
- controller target/device
- board/chip badge
- runtime state badge
- validation state
- build/apply actions

### Left rail

Shows:

- project tree
- current workspace navigation
- block/template palette when relevant
- filters

### Center

Shows the main active workspace:

- machine graph
- logic graph
- board/resource map
- runtime overview

### Right inspector

Shows selected item details:

- object metadata
- block parameters
- pin or resource binding details
- diagnostics help
- documentation/context

### Bottom strip

Collapsible:

- validation trace
- build/materialize trace
- request trace
- event log

## Phased implementation plan

## Phase 0. Contract freeze

Goal:

- freeze the controller-hosted editor strategy in docs and local architecture

Deliverables:

- this roadmap
- `editor-web` README alignment
- shell/workspace naming aligned with current intent

Done when:

- project docs no longer describe `editor-web` as a side prototype only
- the four-workspace model is stated consistently
- build/apply direction is explicitly acknowledged

## Phase 1. Unified shell adoption

Goal:

- make `editor-web` the canonical shell served by the controller

Deliverables:

- controller serves the new shell bundle
- legacy UI becomes embedded functionality, not the main entry experience
- one navigation model

Done when:

- opening the controller lands in the new shell
- the user does not need to choose between separate editors
- the shell exposes `Machine`, `Logic`, `Bind`, `Observe`

## Phase 2. Bind becomes production-grade

Goal:

- move basic commissioning to the new shell

Deliverables:

- board/chip/controller selection
- board map
- quick DI/DO/AI/AO bind
- reserved/conflict warnings
- output test

Done when:

- a user can configure board + bind a relay output without entering legacy tabs
- unbound/conflicting resources are visible immediately
- the blink relay bench path is reproducible entirely from `Bind`

## Phase 3. Observe becomes production-grade

Goal:

- move runtime verification to the new shell

Deliverables:

- live Wi-Fi state
- IP and mode truth
- relay and timer runtime status
- OLED preview
- diagnostics stack
- jump-to-source links

Done when:

- the blink relay bench path can be verified entirely from `Observe`
- live values reflect runtime truth without using legacy overview panels
- OLED status is understandable from the new shell

## Phase 4. Machine becomes the default engineering home

Goal:

- make object composition the main authoring path

Deliverables:

- stable graph canvas
- nested object drill-in
- reusable templates
- compact object contracts

Done when:

- simple mechanisms can be authored without legacy editor/sequences tabs
- object hierarchy is navigable from one canvas model
- nested objects behave like first-class project structure

## Phase 5. Logic becomes the home of interpretation

Goal:

- remove meaning from low-level channel forms and place it in typed logic

Deliverables:

- primitive block catalog
- typed connections
- quick logic patterns
- inspector-based advanced parameters

Done when:

- thresholds, timers and interlocks no longer need to live in channel forms
- neutral block naming is consistent across library, templates and runtime preview
- a pump/relay behavior slice can be understood from the logic graph

## Phase 6. Materialize and Apply become first-class

Goal:

- make runtime generation explicit and inspectable

Deliverables:

- validation view
- materialization preview
- runtime diff before apply
- apply trace

Done when:

- a user can see what runtime channels, display widgets and bindings will be created
- validation errors are shown before apply
- apply/download status is visible in one place

## Phase 7. Legacy reduction

Goal:

- remove duplicated legacy surfaces from the main flow

Deliverables:

- legacy pages moved behind `Advanced` or removed
- stable commissioning path lives entirely in the new shell

Done when:

- normal engineering work does not require the old tabbed UI
- legacy code remains only for recovery or transitional deep-service scenarios

## Initial implementation order

The next practical work order should be:

1. Phase 0 documentation alignment
2. Phase 2 `Bind`
3. Phase 3 `Observe`
4. Phase 1 shell entry unification
5. Phase 4 `Machine` stabilization
6. Phase 5 `Logic`
7. Phase 6 materialize/apply
8. Phase 7 legacy reduction

This order is intentional:

- stable commissioning first
- richer authoring second
- removal of legacy tabs last

## Scope guardrails

Do not:

- build a third UI
- keep duplicating the same surface in legacy and new shells forever
- turn `Bind` into a giant settings form
- make `Observe` another authoring page
- let advanced experimental features block the stable commissioning path

## Success criteria

The direction is correct if:

1. a simple engineer can open the controller and understand the next step quickly
2. board/chip/port configuration feels short like OpenPLC setup
3. machine authoring still feels richer and more hierarchical than OpenPLC
4. runtime verification happens in the same shell as design and bind
5. materialization/apply becomes visible and trustworthy instead of hidden magic
