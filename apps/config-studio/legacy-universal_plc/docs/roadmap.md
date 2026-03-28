# universal_plc Roadmap

## Main Goal

Build a next-generation visual PLC platform for real automation systems.

The project is not:

- boiler software
- a generic HMI constructor
- only a node editor

The project is:

- a universal automation platform
- with a small and stable core
- with a strong native controller library
- with domain packages built from standard controllers
- with concrete project installations on top

Core formula:

- `Core` gives the universal model, compiler and runtime
- `Library` gives reusable typed native controllers
- `Packages` give domain assemblies
- `Projects` give real installations with real I/O, settings and views

## Development Method

We develop the platform in four layers:

1. `Platform Core`
2. `Native Controller Library`
3. `Domain Packages`
4. `Projects / Installations`

## UI Method

Web UI must be built as a schema-driven surface, not as a collection of one-off hardcoded screens.

Rules:

- configuration pages should follow stable project and controller contracts
- forms should be grouped by neutral sections such as project, runtime, hardware, bindings and views
- boiler-specific or package-specific screens must not define the global configuration structure
- editor and setup UI should grow from shared schemas and standard interfaces
- if a page feels tied to one machine, it probably belongs to a package wizard, not to the core setup surface
- local draft editing, import/export and raw JSON visibility are first-class tools during the current phase
- workspace tabs such as `Project`, `System`, `Hardware` and `Views` should come before deep runtime-oriented forms
- core registries such as `objects`, `signals`, `links` and `alarms` should get first-class editors before we optimize compiler/runtime behavior
- editor refactors should follow the canonical assembly flow defined in:
  - [editor-workflow-v1.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/standards/editor-workflow-v1.md)
- internal `Flow Edges`, system `Links`, and hardware `Bindings` must stay separate in both schema and UI
- `Component Editor` must use mode-specific layouts for `Interface`, `Flow`, `State` and `JSON`, not one forced grid for all modes

### 1. Platform Core

Core contains only universal mechanisms:

- meta model
- runtime engine
- compiler
- signal registry
- state machine engine
- flow engine
- alarm engine
- hardware abstraction
- explain / trace
- storage / project schema

Core must not absorb domain behavior.

### 2. Native Controller Library

Library contains official reusable automation objects.

First official focus:

- `PermissiveGroup`
- `TripGroup`
- `AlarmObject`
- `PumpPairController`
- `SequenceController`

Native controllers must be:

- reusable across domains
- typed
- deterministic
- explainable
- visually first-class

### 3. Domain Packages

Packages assemble domain behavior from native controllers.

Current reference direction:

- `Boiler Package`
- `Pump Station Package`
- `Tank Level Package`
- `Fuel Transfer Package`

Rule:

- domain logic belongs in packages
- not in core

### 4. Projects / Installations

Projects define:

- real hardware bindings
- real parameters
- real tags
- real screens
- real runtime defaults

## Development Tracks

We work in parallel but with clear ownership:

### Track A - Core

Build and stabilize universal platform mechanisms.

### Track B - Library

Build official native controllers with clear contracts.

### Track C - Reference Validation

Use `boiler` as a stress-test package to validate the platform without letting it dictate the core.

## Execution Method

We move in this order:

1. define standards
2. define schema
3. build configuration UI around the schema
4. harden config JSON through real editing workflows
5. build interpreter / compiler around the stabilized model
6. build runtime against the stabilized model
7. validate on boiler reference
8. expand to other packages

## Current Priority

At the current stage we are explicitly `config-first`, not `controller-first`.

That means:

- the immediate product is the configuration model and editor surface
- project JSON must be refined before runtime becomes authoritative
- interpreter and runtime should follow the stabilized configuration model
- controller deployment must not force premature schema decisions

## Rules For Decisions

When deciding where logic belongs:

- if it is universal, it belongs in `core`
- if it is reusable and object-like, it belongs in `library`
- if it is machine/domain-specific, it belongs in `packages`
- if it is installation-specific, it belongs in `projects`

Examples that do not belong in core:

- pre-purge `35s`
- HFO-specific policy
- low-low water forcing both pumps
- burner misfire details

## Progress Logging Rule

To avoid losing context, every meaningful project update must also update:

- [update-log.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/update-log.md)

Each log entry should contain:

- date
- scope
- what was done
- why it matters
- next intended step

This is a project rule, not an optional habit.

## Current Phase

Current phase is:

- platform foundation and standards freeze for `v1`
- bootstrap config studio around canonical project JSON
- refine schema through real editing workflows
- keep interpreter/runtime downstream from stabilized configuration

## Editor vNext

The accepted editor/model vNext is defined in:

- [0007-definition-studio-composition-v1.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/adr/0007-definition-studio-composition-v1.md)
- [definition-studio-composition-v1-breakdown.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/specs/definition-studio-composition-v1-breakdown.md)

Current architectural direction:

- the platform moves from a system-only assembly editor to a hierarchical object authoring platform
- `ObjectType` and `ObjectInstance` are first-class separate entities
- `Definitions`, `System`, `Hardware` and `Views` are the canonical top-level surfaces
- `Composition` is the first fully implemented internal authoring surface
- `State` and `Flow` remain visible as shells before their authoring surfaces are implemented
- `semantic build / elaboration` is the required bridge between editor/model stabilization and future runtime/compiler work

Current milestone:

- `Definition Shell + Composition v1`

