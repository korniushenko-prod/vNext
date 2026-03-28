# @universal-plc/target-adapter-contracts

Canonical contracts between materialized runtime packs and target adapters.

## Scope
- target adapter manifest
- deployment request/result contracts
- readback contracts
- structural validation and fixtures

## Non-goals
- no materializer logic
- no target-specific firmware/runtime implementation
- no editor or authoring model

## Canonical rule
This package defines the boundary *after* materialization and *before* target-specific execution.
