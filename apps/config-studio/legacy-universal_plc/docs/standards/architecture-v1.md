# Architecture v1

`universal_plc` is organized in four product layers:

1. `Platform Core`
2. `Native Controller Library`
3. `Domain Packages`
4. `Projects / Installations`

## Core

Core owns only universal mechanisms:

- meta model
- runtime engine
- compiler
- signal registry
- state machine engine
- flow engine
- alarm engine
- hardware abstraction layer
- explain / trace
- storage and project schema

Code layout:

- `src/core/model`
- `src/core/runtime`
- `src/core/compiler`
- `src/core/hal`
- `src/core/debug`
- `src/core/storage`

## Native Library

Library contains official reusable automation objects:

- groups
- utilities
- controllers
- safety

Current bootstrap focus:

- `PermissiveGroup`
- `TripGroup`
- `AlarmObject`
- `PumpPairController`
- `SequenceController`

## Packages

Packages are domain assemblies built from native controllers:

- `boiler`
- `pump_station`
- `tank_level`
- `fuel_transfer`

## Projects

Projects are concrete installations with real bindings, settings, tags, screens and views.
