# @universal-plc/runtime-pack-schema

Canonical schema for materialized runtime packs emitted from the authoring model.

## Scope
- normalized runtime pack types
- structural validation for runtime pack shape
- fixtures for flattened execution-ready connection graphs

## Non-goals
- no editor/UI contracts
- no authoring `signals`
- no target-specific ESP32 details
- no materializer implementation

## Canonical rules
- runtime pack is `instances + connections`, not `signals`
- runtime connections are one-source-to-one-target normalized links
- params are resolved values, not parent bindings
- runtime pack may carry target-neutral resource bindings
