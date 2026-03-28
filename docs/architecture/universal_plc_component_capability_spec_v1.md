# universal_plc component capability spec v1

Status: accepted
Date: 2026-03-28

## Capability model intent
A component capability describes what an object type can expose to authoring, materialization, runtime targets, diagnostics, and operator tooling without leaking implementation details.

## v1 capability groups
- interface capability
- composition capability
- state capability (planned)
- flow capability (planned)
- diagnostics capability
- hardware binding hints
- view binding hints

## Rules
1. Capabilities belong to `ObjectType`, not `ObjectInstance`.
2. Hardware and Views consume capabilities but do not redefine them.
3. Runtime targets receive only materialized capability projections.
4. Composition is the first fully supported authored capability in v1.

## v1 mandatory capability surface
- ports
- params
- alarms contract
- composition child instances
- composition routes
- diagnostics surface

## v1 planned but not implemented
- authored state machine
- authored flow graphs
- advanced alarm graph
- simulation facets

## Materializer expectation
The materializer resolves object types, instances, signals, composition routes, and effective interfaces into a normalized runtime pack and target adapter input.
