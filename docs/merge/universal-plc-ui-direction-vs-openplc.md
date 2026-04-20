# universal_plc UI Direction vs OpenPLC

## Context

This note is about the `universal_plc` design/config UI, not the embedded `shipcontroller-esp32` runtime UI.

Relevant local reference:

- [index.html](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio/legacy-universal_plc/data/index.html)
- [app.js](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio/legacy-universal_plc/data/app.js)
- [project.json](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio/legacy-universal_plc/data/project.json)

## What already looks right in universal_plc

The current direction already has several good product instincts.

### 1. Workspace framing is stronger than in ShipController

The old `universal_plc` design already splits the UI into:

- project tree
- main workspace
- inspector
- live JSON

That is a better foundation for a real engineering studio than a pure tab-and-form runtime UI.

### 2. The model already pushes toward a real engineering language

Even in the legacy browser version, the shape is already closer to a project model than to simple PLC variable editing:

- project
- definitions
- system
- hardware
- views

This is closer to our final machine-first direction.

### 3. The small block/link editor was the right instinct

The moment scenes, links and block relations started appearing, the UI became more aligned with the product goal:

- not just “configure fields”
- but “compose a machine”

That is the right path.

## What still feels wrong today

The problem is not that the idea is wrong.

The problem is that the editor still feels like:

- tree + forms + JSON preview

with a small visual graph nearby,

instead of:

- visual machine workspace first
- forms second

That is the main shift we should make.

## Why OpenPLC feels simpler

OpenPLC is simpler mostly because it separates responsibilities very aggressively.

From the OpenPLC ecosystem:

- runtime and editor are separate
- hardware configuration is separate from program authoring
- HMI/SCADA is treated as another layer

Useful references:

- OpenPLC runtime: https://github.com/thiagoralves/OpenPLC
- OpenPLC runtime v3: https://github.com/thiagoralves/OpenPLC_v3
- OpenPLC Editor: https://github.com/thiagoralves/OpenPLC_Editor
- OpenPLC editor page: https://openplcproject.github.io/plcopen-editor
- OpenPLC upload/runtime basics: https://openplcproject.github.io/reference/basics/upload

### The real lesson from OpenPLC

Not “copy ladder” and not “copy their UI”.

The real lesson is:

- keep I/O binding simple
- keep program composition in its own surface
- keep visualization as another surface

That is why it feels faster.

## What universal_plc should borrow from OpenPLC

### Borrow

1. Simple first-use binding flow
2. Strong separation between hardware and logic
3. Separate authoring workspace from runtime inspection
4. Smaller mental steps

### Do not borrow

1. PLC-program-first worldview
2. Variable/address-first UX
3. Heavy dependence on IEC editor semantics as the product identity

Our product is not:

- “another PLC editor”

It is:

- a machine construction and diagnostics platform

## Recommended UX simplification

## 1. Turn the studio into 4 workspaces

The most important product decision is not a widget choice.

It is workspace clarity.

### A. Bind

Purpose:

- hardware
- channels
- external resources
- signal source attachment

This should feel almost as quick as OpenPLC I/O setup.

### B. Logic

Purpose:

- comparators
- thresholds
- filters
- conditions
- reusable logic blocks

This is where signal meaning belongs.

### C. Machine

Purpose:

- scenes
- states
- flows
- transitions
- machine sections

This should become the main visual workspace.

### D. Observe

Purpose:

- live values
- alarms
- diagnostics
- trace
- trends

This is where the machine is watched, not authored.

## 2. Make the visual graph the primary editor

This is the biggest product correction.

Right now the graph/editor feels auxiliary.

It should become primary.

### The graph should show

- sources on the left
- processing/logic in the middle
- outputs/services on the right
- state regions or scene regions
- edges with explicit meaning
- compact summaries on nodes
- diagnostics badges

### Forms should become secondary

Forms should open when:

- node selected
- edge selected
- state selected
- composite selected

Not the other way around.

## 3. Keep JSON visible, but demote it

The live JSON preview is useful.

But it should not compete visually with the main authoring surface.

Better role:

- right-side inspector detail
- advanced/debug mode
- not a co-equal center of gravity

## 4. Keep quick editing brutally simple

OpenPLC feels fast because early actions are short.

We should keep the same discipline.

Examples:

- Add input
- Add output
- Add analog signal
- Add timer
- Add comparator
- Add state
- Connect A -> B

These should be 1-3 fast gestures, not long forms.

## Recommended visualization direction

## 1. Not generic “dashboard pretty”

The UI should not look like a startup admin panel.

It should look like:

- technical
- deliberate
- spatial
- machine-oriented

## 2. Strong visual structure

Use:

- left rail for project/navigation
- center canvas for graph/machine
- right inspector for selected item
- top strip for context and mode

This is already hinted at in legacy `universal_plc`; we should strengthen it.

## 3. Visual language for engineering meaning

Suggested semantics:

- blue = signals / information
- amber = conditions / warnings
- green = active execution path
- red = trip / alarm / lockout
- slate = structure / metadata

Node types should also feel different:

- source nodes
- logic nodes
- timing nodes
- state nodes
- output nodes
- diagnostic nodes

## 4. Scene and machine visualization should be layered

We need two graph scales:

### Macro

- machine scenes
- states
- major sections
- transitions

### Micro

- internal flow within a section or state
- signals
- blocks
- conditions

This prevents the graph from becoming a spaghetti wall.

## Recommended frontend stack

## My recommendation

### Keep

- React
- TypeScript
- Zustand
- Ajv
- ECharts

These are the right picks.

### Graph editor: choose React Flow first

Your instinct about `Rete.js` is understandable, but for this product I would start with `React Flow`, not `Rete.js`.

Reason:

- our value is not a generic workflow engine
- our value is our model, semantics and compiler/materializer
- `React Flow` gives us a strong canvas/editor UX without trying to become the semantic core
- `Rete.js` is powerful, but it is more tempting to let its workflow model start shaping our product model

So:

- `React Flow` for canvas/editor UX
- our own semantics for project model and runtime meaning

That keeps the boundary cleaner.

### State semantics: use XState as reference, not as embedded core

Agreed.

Best use:

- editor semantics
- simulator semantics
- preview/statechart inspiration

Not:

- direct embedded runtime dependency

### Validation: Ajv + JSON Schema

Agreed without hesitation.

This should stay standard and boring.

### Charts: ECharts

Agreed.

This is the right level of power for engineering trends and diagnostics.

## What to build ourselves

Exactly where your product lives:

### 1. Project model

- signals
- objects
- sections
- scenes
- stateful compositions
- diagnostics
- hardware binding model
- templates

### 2. Materializer / compiler path

- project -> normalized graph
- graph -> runtime pack
- frontend requirements
- diagnostics projections
- provenance

### 3. Runtime object engine

- deterministic execution
- timers
- sequencing
- transitions
- fail-safe behavior
- diagnostics snapshots

### 4. Template system

- machine templates
- reusable sections
- package definitions

### 5. Diagnostics as model

- trigger
- cause
- hint
- snapshot
- operator guidance

That is not infrastructure.
That is the product.

## What not to build ourselves

Agreed with your boundary.

Do not build:

- custom canvas engine
- custom schema validator
- custom chart library
- custom generic statechart engine
- custom frontend state manager
- custom generic build toolchain

## Final product decision

If we reduce this to one clear call:

### Build universal_plc as

- a visual machine studio
- with a strong project tree and inspector
- with a first-class graph workspace
- with quick bind for hardware
- with explicit logic workspace
- with separate observe/diagnostics workspace

### Do not build it as

- a bigger forms app
- a prettier variable table
- a clone of OpenPLC editor
- a generic workflow IDE

## Practical next move

The next correct implementation step is:

1. Freeze the 4 workspace model:
   - Bind
   - Logic
   - Machine
   - Observe
2. Pick `React Flow` as the first graph canvas
3. Rebuild the current small scene/block/link editor as the `Machine` workspace centerpiece
4. Push existing forms into the right inspector instead of the main center area
5. Keep Ajv/JSON Schema and our own project model as the contract spine

## Bottom line

OpenPLC is simpler because it separates layers.

universal_plc should copy that discipline, but keep its own stronger identity:

- machine-first
- diagnostics-first
- template-driven
- visual composition first

The right move is not to become more like OpenPLC.

The right move is:

- simplify like OpenPLC
- visualize better than OpenPLC
- keep our own model as the center of gravity
