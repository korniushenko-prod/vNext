# @universal-plc/materializer-core

Canonical materializer core for transforming the authoring `ProjectModel`
into a target-neutral `RuntimePack`.

## Scope
- normalize project input
- resolve local `type_ref`
- build effective runtime instances
- expand `system.signals` into normalized point-to-point runtime connections
- expand `composition.routes` recursively
- resolve params into final runtime values
- emit diagnostics and a target-neutral `RuntimePack`

## Non-goals
- no UI/editor logic
- no ESP32 or target-specific emission
- no execution scheduling
- no State/Flow execution logic
- no live apply/deploy logic

## Pipeline
1. structural validation of `ProjectModel`
2. normalize project shape
3. build type registry
4. materialize system instances
5. materialize system signals
6. expand composition recursively
7. finalize `RuntimePack`

## Package boundaries
- imports from `@universal-plc/project-schema`
- imports from `@universal-plc/runtime-pack-schema`
- does **not** import from UI, `targets/*`, or legacy runtime code

## First accepted fixtures
- `empty-project.json`
- `timed-relay.project.json`
- `boiler-composition.project.json`
- `invalid-missing-type.project.json`
