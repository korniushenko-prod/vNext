# @universal-plc/editor-web

## Purpose

Graph-first `universal_plc` engineering studio shell for v1.

## Workspaces

- `Bind`: logical to physical I/O binding
- `Logic`: signals and block logic skeleton
- `Machine`: object topology at the top level, object behavior one level deeper
- `Observe`: runtime truth, diagnostics, live snapshot

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
  - `Topology`: objects and their public contracts
  - `Object`: internal behavior or structure of the selected object
- top-level `Machine` view shows only objects and composition links
- composition links are limited to command, permission, status, or fault semantics
- internal behavior stays inside the object boundary
- `Object` view uses `React Flow` only for internal behavior visualization
- `Object` also has a `Structure` lens inspired by the legacy Config Studio composition canvas:
  - boundary rails for object interface ports
  - internal units in the middle
  - local routes between ports and internal nodes
- `Machine` includes breadcrumbs and cross-workspace navigation into `Logic` and `Bind`
- `Bind` is for physical/logical I/O binding
- `Logic` is for signal and block logic skeleton
- `Observe` is for runtime diagnostics and live state
- forms live in the right inspector
- live JSON/debug state lives in the bottom panel

This step does not integrate runtime execution, materialization, or firmware APIs.

## Non-goals for this step

- no firmware work
- no Modbus
- no runtime execution engine
- no materializer integration
- no OpenPLC clone
- no `Rete.js`
- no destructive rewrite of `apps/config-studio`
- no changes to `shipcontroller-esp32`

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
