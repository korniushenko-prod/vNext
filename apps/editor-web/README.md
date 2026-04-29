# @universal-plc/editor-web

## Purpose

Graph-first `universal_plc` engineering studio shell for v1.

This package is the canonical frontend source for the controller-hosted editor
direction in `vNext`.

The product direction is:

- one engineering editor
- hosted by the controller
- built from `apps/editor-web`
- gradually absorbing stable commissioning and runtime-facing surfaces from
  `targets/shipcontroller-esp32/data`

Reference roadmap:

- [`../../docs/merge/controller-hosted-editor-unification-roadmap.md`](../../docs/merge/controller-hosted-editor-unification-roadmap.md)

## Workspaces

- `Bind`: logical to physical I/O binding
- `Logic`: signals and block logic skeleton
- `Machine`: system objects at the top level, object internals one level deeper
- `Observe`: runtime truth, diagnostics, live snapshot

Global shell actions are expected to grow around these workspaces:

- `Validate`
- `Build`
- `Preview Runtime`
- `Apply`

## Main architectural rule

`React Flow` is used only as a presentation layer.

The Universal PLC domain model remains the source of truth.

Boundary:

- domain project model
- `machineGraphAdapter`
- React Flow nodes and edges

## Why React Flow

- lightweight graph canvas
- good React integration
- does not impose workflow semantics
- lets Universal PLC keep its own model, runtime, and materializer boundaries

## Architecture

- `Machine` is the primary workspace
- `Machine` is split into two levels:
  - `System`: large engineering objects and their public contracts
  - `Object`: internal behavior or structure of the selected object
- top-level `Machine` view shows only large system objects and composition links
- composition links are limited to command, permission, status, or fault semantics
- internal behavior stays inside the object boundary
- object contracts are first-class: commands, inputs, outputs, status, permissions, and alarms
- demo authoring data now lives in a document file:
  - [`src/studio/model/demoProject.data.json`](./src/studio/model/demoProject.data.json)
- [`src/studio/model/demoProject.ts`](./src/studio/model/demoProject.ts) now acts as a typed loader and model contract layer
- the app loads a real runtime document from:
  - [`public/project.json`](./public/project.json)
- if `project.json` is missing or invalid, the UI falls back to the bundled demo document
- `Object` view uses `React Flow` only for internal behavior visualization
- `Object` also has a `Structure` lens inspired by the legacy Config Studio composition canvas:
  - boundary rails for object interface ports
  - internal units in the middle
  - local routes between ports and internal nodes
- authoring direction:
  - top level = object-to-object relationships
  - inside object = port-to-node and node-to-node relationships
  - detail view later = timers, filters, comparators, and technical evaluation internals
- `Machine` includes breadcrumbs and cross-workspace navigation into `Logic` and `Bind`
- `Bind` is for physical/logical I/O binding
- `Logic` is for signal and block logic skeleton
- `Observe` is for runtime diagnostics and live state
- forms live in the right inspector
- live JSON/debug state lives in the bottom panel

For the controller-hosted direction:

- `Bind` must grow into the main commissioning surface for board/chip/GPIO
  configuration
- `Observe` must become the main runtime truth surface
- `Machine` remains the default engineering home screen
- `Logic` remains the home of neutral interpretation blocks
- materialization and apply/download stay explicit shell actions rather than a
  hidden side effect

The project model remains independent from runtime rendering and transport
mechanics even as the controller-hosted bundle grows richer.

## Non-goals for this step

Historical non-goals from the first shell prototype included:

- no runtime execution integration
- no materializer integration
- no `shipcontroller-esp32` integration

Those boundaries were useful for the first standalone shell pass, but are no
longer the long-term product direction.

Current hard non-goals still remain:

- no OpenPLC clone
- no `Rete.js`
- no destructive rewrite of `apps/config-studio`

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
