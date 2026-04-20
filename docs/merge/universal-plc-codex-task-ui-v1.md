# Codex Task: Universal PLC UI v1

## Task status

This is the corrected implementation brief for the new `universal_plc` UI path inside `vNext`.

It replaces the ambiguous version of the task that mixed:

- `legacy-universal_plc`
- current `config-studio`
- embedded `shipcontroller-esp32`

## Scope boundary

Work only on the new graph-first `universal_plc` editor path.

Do **not** modify:

- `targets/shipcontroller-esp32`
- embedded firmware
- old runtime UI surfaces
- legacy static `universal_plc` files except as reference

## Real repository context

### Use as reference only

- [apps/config-studio/legacy-universal_plc/data/index.html](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio/legacy-universal_plc/data/index.html)
- [apps/config-studio/legacy-universal_plc/data/app.js](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio/legacy-universal_plc/data/app.js)
- [apps/config-studio/legacy-universal_plc/data/project.json](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio/legacy-universal_plc/data/project.json)

### Existing current app layer that must not be broken

- [apps/config-studio](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/apps/config-studio)

This current app is a frozen/read-only service/package/hardware UI lane. Do not convert it directly into the new graph-first studio.

### Existing shared packages

These are already real and should be respected as future integration points:

- [packages/project-schema](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/packages/project-schema)
- [packages/runtime-pack-schema](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/packages/runtime-pack-schema)
- [packages/materializer-core](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/packages/materializer-core)

### Direction documents

Read and follow:

- [universal-plc-ui-direction-vs-openplc.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/docs/merge/universal-plc-ui-direction-vs-openplc.md)
- [universal-plc-v1-ui-architecture-plan.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/vNext/docs/merge/universal-plc-v1-ui-architecture-plan.md)

## Implementation target

Create a **new app**:

- `apps/editor-web`

This new app becomes the first graph-first `universal_plc` studio shell.

Do not try to mutate `legacy-universal_plc` into React.
Do not try to layer the new graph-first UI directly into the existing `config-studio` read-only service shell.

## Main goal

Build a new UI skeleton for `universal_plc` where:

- there are 4 workspaces:
  - `Bind`
  - `Logic`
  - `Machine`
  - `Observe`
- `Machine` is the default and primary workspace
- the center of `Machine` is a `React Flow` graph canvas
- forms live in the right inspector
- project tree and palette live on the left
- live JSON and runtime snapshot stay available, but are secondary
- `React Flow` is used only as visual infrastructure

## Core architectural rule

`React Flow` must never become the source of truth.

Correct boundary:

`Universal PLC domain model`
-> `UI adapter / React Flow mapping`
-> `React Flow nodes / edges`

Incorrect boundary:

`React Flow nodes / edges`
-> `runtime semantics`

The domain model remains the source of truth.

## Required tech for this task

Required:

- `react`
- `react-dom`
- `typescript`
- `zustand`
- `@xyflow/react`

Optional now, but acceptable to add:

- `ajv`
- `echarts`

Do not use:

- `Rete.js`

## New app structure

Target structure:

```text
apps/editor-web/
├─ package.json
├─ index.html
├─ tsconfig.json
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ styles.css
│  ├─ studio/
│  │  ├─ StudioShell.tsx
│  │  ├─ workspace/
│  │  │  ├─ BindWorkspace.tsx
│  │  │  ├─ LogicWorkspace.tsx
│  │  │  ├─ MachineWorkspace.tsx
│  │  │  └─ ObserveWorkspace.tsx
│  │  ├─ panels/
│  │  │  ├─ LeftProjectPanel.tsx
│  │  │  ├─ InspectorPanel.tsx
│  │  │  └─ BottomLivePanel.tsx
│  │  ├─ machine/
│  │  │  ├─ MachineCanvas.tsx
│  │  │  ├─ MachineNode.tsx
│  │  │  └─ machineGraphAdapter.ts
│  │  ├─ store/
│  │  │  └─ studioStore.ts
│  │  └─ model/
│  │     └─ demoProject.ts
│  └─ README.md
└─ README.md
```

If small deviations are needed, preserve the same meaning:

- shell
- workspace components
- panels
- machine graph adapter
- store
- demo domain model

## Workspace model

The new shell must expose these workspaces:

- `Bind`
- `Logic`
- `Machine`
- `Observe`

Default active workspace:

- `Machine`

## Layout

Build this shell layout:

```text
┌────────────────────────────────────────────────────────────┐
│ Top bar: Universal PLC Studio | Bind Logic Machine Observe │
├───────────────┬──────────────────────────┬─────────────────┤
│ Left panel    │ Center workspace         │ Right inspector │
│ Project tree  │ Machine graph / etc.     │ Selected item   │
│ Palette       │                          │ Properties      │
├───────────────┴──────────────────────────┴─────────────────┤
│ Bottom panel: live JSON / runtime snapshot / logs           │
└────────────────────────────────────────────────────────────┘
```

### Left panel

Contains:

- project tree
- palette / object list
- quick sections:
  - Signals
  - Blocks
  - Machines
  - IO

### Right panel

Contains:

- inspector for selected item
- properties of selected:
  - state
  - transition
  - signal
  - block
  - binding

### Bottom panel

Contains:

- live JSON
- runtime snapshot placeholder
- diagnostics/logs placeholder

## Machine workspace

This is the primary workspace for v1.

### Center area

Use `React Flow` as the graph canvas.

Render a demo machine:

- `Idle`
- `Starting`
- `Running`
- `Stopping`
- `Fault`

With transitions:

- `Idle -> Starting` event: `start`
- `Starting -> Running` guard: `feedback_ok`
- `Running -> Stopping` event: `stop`
- `Stopping -> Idle` guard: `stopped`
- `Starting -> Fault` guard: `timeout`
- `Running -> Fault` guard: `fault_detected`
- `Fault -> Idle` event: `reset`

### State node requirements

Each state node should show:

- name
- kind/status
- active/inactive marker placeholder
- short parameter summary

### Transition edge requirements

Each edge should show:

- event
- guard when present

### Inspector behavior

When selecting a state node, inspector shows:

- selected name
- kind
- entry actions
- exit actions
- timeout
- diagnostics placeholder

When selecting a transition edge, inspector shows:

- source
- target
- event
- guard
- delay
- action

Read-only is acceptable in the first step. Local editable state is also acceptable.

### Drag behavior

Dragging a state node must update the **domain model/store**, not only React Flow local state.

## Bind workspace

This is a fast I/O binding view.

### Center area

Show a simple binding table like:

| Logical Signal | Direction | Physical Source | Type | Status |
|---|---|---|---|---|
| pump.start_cmd | output | DO1 | bool | false |
| pump.run_fb | input | DI1 | bool | true |
| pump.fault_fb | input | DI2 | bool | false |
| tank.level | input | AI1 | analog | 42.1 |

### Purpose

This workspace must:

- make physical/logical mapping visible
- stay simple
- not become the main logic editor

### Inspector

Show selected binding details:

- logical signal
- physical channel
- debounce
- inversion
- scaling
- fail-safe value

## Logic workspace

This is a skeleton for signal/block engineering logic.

v1 may remain shallow.

### Show

- signal list
- block list
- simple central relation view or table

Example blocks:

- `StartStopLatch`
- `ThresholdMonitor`
- `TimerOn`
- `InterlockSet`

### Purpose

This workspace prepares the future logic layer, but must not replace `Machine` as the main screen.

## Observe workspace

This is runtime truth.

### Show

- current active states
- signal values
- diagnostics
- runtime health
- live JSON

### Example cards

- `Machine State: Running`
- `Runtime Health: OK`
- `Active Diagnostics: 1`
- `Last Event: start`

### Diagnostics placeholder

Example structure:

| Severity | Object | Cause | Hint |
|---|---|---|---|
| warning | pump_1 | no feedback timeout | check feedback input |

## Zustand store

Create a store close to this shape:

```ts
type WorkspaceId = 'bind' | 'logic' | 'machine' | 'observe';

interface StudioState {
  activeWorkspace: WorkspaceId;
  selectedItemId: string | null;
  selectedItemType: 'state' | 'transition' | 'signal' | 'block' | 'binding' | null;
  project: UniversalPlcDemoProject;
  setActiveWorkspace(workspace: WorkspaceId): void;
  selectItem(type: StudioState['selectedItemType'], id: string | null): void;
  updateMachineNodePosition(id: string, position: { x: number; y: number }): void;
}
```

Use this as guidance, not a rigid literal requirement.

## Demo domain model

Create a temporary local domain model in the new app.

Use a shape like:

```ts
export interface UniversalPlcDemoProject {
  id: string;
  name: string;
  machines: MachineDefinition[];
  signals: SignalDefinition[];
  bindings: IoBindingDefinition[];
  blocks: LogicBlockDefinition[];
  runtimeSnapshot: RuntimeSnapshot;
}

export interface MachineDefinition {
  id: string;
  name: string;
  states: MachineStateDefinition[];
  transitions: MachineTransitionDefinition[];
}

export interface MachineStateDefinition {
  id: string;
  name: string;
  kind: 'normal' | 'initial' | 'fault' | 'final';
  position: { x: number; y: number };
  entryActions?: string[];
  exitActions?: string[];
  timeoutMs?: number;
}

export interface MachineTransitionDefinition {
  id: string;
  source: string;
  target: string;
  event?: string;
  guard?: string;
  action?: string;
}
```

Important:

`React Flow` nodes and edges must be derived from this model through an adapter.

## Machine graph adapter

Create:

- `machineGraphAdapter.ts`

Responsibilities:

- map machine model -> `React Flow` nodes
- map machine model -> `React Flow` edges
- map selection back into studio selection
- map drag updates into domain position updates

Example API:

```ts
export function machineToFlowNodes(machine: MachineDefinition): Node[] {}
export function machineToFlowEdges(machine: MachineDefinition): Edge[] {}
export function flowNodePositionToMachineUpdate(
  nodeId: string,
  position: { x: number; y: number }
): MachinePositionUpdate {}
```

## Live JSON

Bottom panel must show:

- current demo project JSON
or
- runtime snapshot JSON

This panel exists for:

- debugging
- traceability
- verification

It must not become the main editing surface.

## README requirements

Add or update README for the new app.

Must explain:

- `Universal PLC Studio` UI direction
- the 4 workspaces:
  - `Bind`
  - `Logic`
  - `Machine`
  - `Observe`
- `Machine` as the primary workspace
- `React Flow` as presentation layer only

Also explain:

### Why React Flow

- lightweight graph canvas
- does not impose workflow/runtime semantics
- allows Universal PLC to keep its own model/materializer/runtime boundaries

### Non-goals for this step

- no embedded firmware work
- no Modbus
- no runtime execution engine
- no materializer integration
- no OpenPLC clone
- no Rete.js

## What not to do

Do not:

- touch `shipcontroller-esp32`
- implement firmware
- implement Modbus
- implement runtime engine
- implement materializer
- implement full schema integration
- move semantics into React Flow
- use `Rete.js`
- turn forms into the main workspace
- destructively rewrite `apps/config-studio`

## Acceptance criteria

Task is complete if:

- `apps/editor-web` runs locally
- all 4 workspaces are visible
- `Machine` opens by default
- `Machine` contains a working `React Flow` demo graph
- selecting a node or edge updates the right inspector
- dragging a state node updates the domain model/store position
- `Bind` shows an I/O binding table
- `Logic` shows signal/block skeleton
- `Observe` shows runtime snapshot/diagnostics skeleton
- bottom panel shows live JSON
- README is updated
- `React Flow` is used only as presentation layer

## Validation/build

If scripts exist, run:

- build
- typecheck
- tests

At minimum, the new app should build successfully.

## Suggested commit message

`feat(editor-web): add graph-first universal plc studio skeleton`

## Compact task prompt

Use this compact prompt if needed:

Implement a new graph-first Universal PLC UI skeleton as a separate app at `apps/editor-web`. Do not modify `shipcontroller-esp32` and do not destructively rewrite `apps/config-studio`. Use `apps/config-studio/legacy-universal_plc` only as UX reference, and follow `docs/merge/universal-plc-ui-direction-vs-openplc.md` plus `docs/merge/universal-plc-v1-ui-architecture-plan.md`. Build a React + TypeScript + Zustand + React Flow app with four workspaces: Bind, Logic, Machine, Observe. Machine must be the default and primary workspace. React Flow must be only a visual canvas; the domain project model must remain the source of truth. Create a local demo domain model, map it to React Flow via an adapter, render a demo machine graph, wire selection into an inspector, and persist node drag positions back into the domain model/store. Bind should show a simple I/O binding table, Logic a signal/block skeleton, Observe a runtime snapshot/diagnostics skeleton, and the bottom panel a live JSON/debug view. Include a README and make sure the new app builds successfully.
