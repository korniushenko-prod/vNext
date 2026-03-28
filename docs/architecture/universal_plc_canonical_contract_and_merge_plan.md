# universal_plc canonical contract and merge plan

Status: accepted
Date: 2026-03-28

## Product boundary
- `universal_plc` defines editor, model, authoring, project schema, definition system, and materializer direction.
- `ShipController` defines runtime, hardware, target execution, device services, and embedded integration.
- `vNext` is the single integration repository where these two lines are joined through shared contracts and a materializer boundary.

## Canonical merge rule
1. Product model flows top-down: project -> definitions -> system -> hardware/views.
2. Runtime flows bottom-up only after materialization.
3. System authoring is `instances + signals`.
4. Composition authoring is `instances + routes`.
5. `ObjectType` and `ObjectInstance` are separate entities in both schema and UI.

## Canonical root sections
- `definitions`
- `system`
- `hardware`
- `views`
- `layouts`
- `imports`

## Week-1 merge objective
- stabilize docs and repo structure
- establish package boundaries
- establish shared contracts
- keep runtime integration out of authoring model internals

## Package boundary intent
- `apps/config-studio`: editor/UI shell and authoring workflows
- `packages/project-schema`: canonical authoring schema
- `packages/runtime-pack-schema`: materialized runtime pack schema
- `packages/materializer-core`: project -> runtime pack transformation
- `packages/target-adapter-contracts`: target integration interfaces
- `targets/shipcontroller-esp32`: imported runtime/hardware base

## Non-goals for week 1
- no new State/Flow implementation
- no simulator push
- no boiler domain expansion
- no inheritance
- no one-canvas-for-everything
