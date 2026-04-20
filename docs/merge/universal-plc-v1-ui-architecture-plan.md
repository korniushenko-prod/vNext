# universal_plc v1 UI Architecture Plan

## Status

This document fixes the new UI direction for `universal_plc`.

The decision is:

- `universal_plc` becomes a graph-first engineering studio
- the main canvas is built on `React Flow`
- forms move into contextual side panels
- the studio is organized around 4 workspaces:
  - `Bind`
  - `Logic`
  - `Machine`
  - `Observe`

This is the v1 UI architecture plan, not the final visual polish spec.

## Product principle

The user should feel that they are:

- building a machine

not:

- filling out disconnected forms

This means:

- the center of gravity is the machine canvas
- structure and behavior are visible
- forms are secondary and contextual

## Core layout

The whole studio uses one consistent shell.

### Top bar

Shows:

- project name
- current workspace
- target/device
- validation/apply state
- live runtime state badge

Purpose:

- global context
- no editing here except high-level commands

### Left rail

Purpose:

- navigation
- tree
- palette
- filters

This is not the main place for parameter editing.

### Center canvas

Purpose:

- primary authoring or observation surface

This is the main screen in every workspace.

### Right inspector

Purpose:

- selected item details
- editing forms
- validation issues
- documentation/help

This is where forms live by default.

### Bottom strip

Optional in v1.

Shows:

- diagnostics
- event log
- apply trace
- validation trace

Keep collapsible.

## Shared visual language

### Node families

- `source`
- `logic`
- `state`
- `machine`
- `output`
- `diagnostic`
- `service`

### Edge families

- `data`
- `event`
- `control`
- `state`
- `reference`

### Color semantics

- blue: information / signals
- green: active path / ready state
- amber: waiting / degraded / attention
- red: fault / trip / blocked
- slate: structure / metadata / inactive

## Workspace 1: Bind

## Goal

Attach project-level logical channels/signals to physical or external resources as quickly as possible.

This is the OpenPLC lesson we do want:

- simple first-use binding

## Center area

Use a board/resource map, not a giant form.

The center shows:

- current target board/module map
- available GPIO / external resources
- current bindings
- conflicts / reservations

### Recommended center views

1. `Board Map`
   - GPIO pins shown spatially or in grouped banks
   - free / assigned / reserved / forbidden

2. `Resource Table`
   - external devices
   - buses
   - remote resources

3. `Quick Bind Panel`
   - selected signal/channel -> assign target

## Left panel

Shows:

- target selector
- channel list
- signal list needing binding
- filter:
  - unbound
  - bound
  - invalid

## Right inspector

When a channel or pin is selected:

- id
- type
- source
- resource/GPIO
- invert/pull-up/basic defaults
- basic units/range for analog

Advanced options stay collapsed.

## Direct canvas editing

Allowed directly on the canvas:

- select pin/resource
- bind/unbind
- move between resources where valid

Not edited directly on canvas:

- advanced analog conditioning
- diagnostics
- semantics

Those belong elsewhere.

## v1 rule

`Bind` must feel short and safe.

If a user needs a long form to create a DI/DO binding, the UI is wrong.

## Workspace 2: Logic

## Goal

Define how signals are interpreted, transformed and combined.

This is where:

- comparators
- filters
- gates
- selectors
- interlocks
- signal processors

live.

## Center area

Use a node graph focused on signal and logic relations.

### What the graph shows

- input signals on the left
- logic blocks in the middle
- outputs/derived signals on the right

### What node cards show

- title
- type
- quick status
- compact ports
- small validation/error badges

## Left panel

Shows:

- block palette
- search
- templates for common logic patterns

Examples:

- threshold monitor
- debounce
- permissive gate
- timer pulse
- rate estimator

## Right inspector

Shows selected node/edge properties:

- block parameters
- signal types
- thresholds
- filter settings
- compatibility diagnostics
- documentation/help

## Direct canvas editing

Allowed directly:

- add block
- connect ports
- disconnect ports
- reorder placement
- rename visible label

Inspector only:

- detailed numeric parameters
- advanced settings
- diagnostics annotations

## v1 rule

Signals and blocks are edited as a graph first, not as long tables first.

Tables may exist as advanced/debug surfaces, but not as the main path.

## Workspace 3: Machine

## Goal

This is the main workspace of the whole product.

Here the engineer builds:

- scenes
- machine sections
- states
- transitions
- orchestration between subflows

This is where the system stops feeling like a PLC editor and starts feeling like a machine studio.

## Center area

Use a hierarchical graph/canvas with two zoom levels.

### Macro level

Shows:

- machine sections
- scenes
- state groups
- major transitions

Examples:

- `Fuel Preparation`
- `Burner Sequence`
- `Feedwater Protection`
- `Alarm Recovery`

### Micro level

Inside a section or state:

- local logic flow
- signal/block relations
- entry/exit effects
- transition conditions

## Left panel

Shows:

- machine tree
- section tree
- state tree
- templates
- reusable machine modules

## Right inspector

When selecting a scene/state/section:

- label
- type
- entry conditions
- exit conditions
- guards
- timers
- links to diagnostics
- links to related logic/signal fragments

## Direct canvas editing

Allowed directly:

- add state
- add scene
- connect transition
- create section
- nest section
- assign one visible condition or target

Inspector only:

- complex guards
- timer semantics
- recovery logic
- detailed diagnostics bindings

## v1 visual pattern

Machine canvas should feel like:

- a technical storyboard of the machine

not:

- a raw dependency graph

That means:

- bigger cards
- clearer hierarchy
- fewer low-level details at macro level

## v1 rule

`Machine` is the default home screen for engineering authoring.

Not `Signals`.
Not `Blocks`.
Not `Settings`.

## Workspace 4: Observe

## Goal

Show runtime truth.

This workspace is for:

- live values
- active states
- alarms
- diagnostics
- traces
- trends

## Center area

Use operator-like but engineering-aware visual panels.

### Main center panels

1. `Machine State View`
   - active scene
   - active states
   - current path
   - blocked transitions

2. `Live Signals`
   - compact signal tiles
   - quality
   - current values
   - freshness

3. `Diagnostics Stack`
   - active alarms
   - cause
   - hint
   - ack state

4. `Trends`
   - selected signal trends
   - compact ECharts view

## Left panel

Shows:

- signal filters
- runtime groups
- diagnostics filters
- recent events

## Right inspector

Shows selected runtime entity:

- signal detail
- object state detail
- alarm snapshot
- transition explanation
- route provenance

## Direct canvas editing

Almost none.

This workspace is read-first.

Allowed:

- acknowledge
- mute/filter
- pin to trend
- jump to source in Logic or Machine

## v1 rule

Observe is not another authoring screen.

It is the runtime truth screen.

## Entity editing rules

To avoid future UI sprawl, use these rules.

## Edit directly on canvas

Good candidates:

- node placement
- edge creation/removal
- section grouping
- state placement
- transition drawing
- quick label rename
- quick bind action

## Edit in inspector only

Good candidates:

- long numeric settings
- advanced validation details
- diagnostics policies
- analog calibration
- modbus/register details
- object lifecycle policies

## Edit via dedicated modal only

Use modals for:

- create from template
- import/export
- conflict resolution
- apply/deploy
- diagnostics snapshot drill-down

## v1 screen list

This is the practical screen set for v1.

## Global shell

- project switcher
- target/device badge
- validate/apply controls
- runtime health badge

## Bind

- board map
- resources list
- quick bind inspector

## Logic

- signal/logic graph
- block palette
- node inspector

## Machine

- machine map
- scene/state graph
- section inspector

## Observe

- runtime overview
- live diagnostics
- live trends
- signal/object inspector

## Explicitly not first-class in v1

These may exist internally, but should not dominate the first user experience:

- giant raw signal tables
- giant raw block tables
- raw JSON editor as central surface
- low-level protocol/register editing as main workflow

## Suggested implementation order

## Phase 1

Build shell + workspace switch + static layout.

Deliver:

- top shell
- left rail
- center canvas
- right inspector
- empty workspace skeletons

## Phase 2

Build `Machine` first.

Deliver:

- React Flow canvas
- scene/state/section nodes
- selection
- inspector for selected items

Reason:

This is the product center.

## Phase 3

Build `Logic`.

Deliver:

- signal/block graph
- palette
- typed connections
- node inspector

## Phase 4

Build `Bind`.

Deliver:

- board map
- resource map
- quick bind flow

## Phase 5

Build `Observe`.

Deliver:

- live state view
- diagnostics stack
- trends
- jump-to-source links

## Library choices

## Chosen base

- `React`
- `TypeScript`
- `Zustand`
- `React Flow`
- `Ajv`
- `ECharts`

## Why React Flow

For v1 we want:

- strong graph UI
- low semantic interference
- our own runtime/model semantics remain dominant

React Flow is a better fit for that than a more opinionated workflow framework.

## Hard architecture rules

1. UI library never defines runtime semantics.
2. Canvas is infrastructure, not domain truth.
3. Project model stays independent from React Flow structures.
4. Inspector forms edit domain entities, not library-native nodes.
5. Runtime and editor remain separate layers.

## Success criteria for v1

The UI direction is correct if:

1. a user starts from `Machine`, not from a giant form
2. `Bind` is short and safe
3. `Logic` feels like typed engineering flow, not generic node art
4. `Observe` feels like runtime truth, not another settings page
5. inspector editing is contextual and does not dominate the main screen

## Bottom line

The universal_plc studio should feel like:

- a machine design environment

not:

- a configuration spreadsheet
- a PLC variable manager
- a prettier forms application

For v1, the decisive move is:

- put `Machine` in the center
- make the graph the main authoring surface
- move forms into the inspector
- keep runtime/model/materializer semantics fully ours
