# @universal-plc/project-schema

Canonical authoring contract for `vNext` projects.

## Scope
- authoring model types
- structural validation
- fixtures for schema-level checks

## Non-goals
- no runtime pack logic
- no ESP32/target logic
- no UI/editor logic
- no semantic build/materialization

## Canonical rules
- `system` contains only `instances` and `signals`
- `system.routes` is forbidden as a canonical authoring field
- system signal endpoints are only `{ instance_id, port_id }`
- composition endpoints are only `parent_port` and `instance_port`
- validation in this package is structural only
