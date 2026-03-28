# ADR 0007 - Definition Studio + ObjectType/ObjectInstance + Composition v1

Status: accepted  
Date: 2026-03-26  
Phase: editor/model stabilization  
Priority: high

## 1. Decision

`universal_plc` fixes the next editor/model architecture as the new baseline, not as a temporary hypothesis.

Accepted architectural decisions:

- `ObjectType` and `ObjectInstance` are separate entities in both model and UI.
- Entering "inside an object" means a transition into `definition scope`, not zooming into an instance card.
- Internal authoring is split into distinct semantic surfaces:
  - `Composition`
  - `State`
  - `Flow`
  - `Diagnostics`
- The first fully implemented internal editor surface is `Composition v1`.
- Before runtime, the project gains an intermediate `semantic build / elaboration` layer.
- `Hardware` and `Views` remain at project level and do not move into type definitions.

## 2. Why

The current system-level editor has reached its natural boundary: top-level installation assembly already works, but internal object authoring is still almost absent.

The rejected path is to keep extending one shared canvas for:

- system wiring
- internal structure
- state logic
- flow logic
- instance context
- type definition context

That path flattens the model and destroys scalability.

The accepted path is hierarchical authoring with explicit scope separation.

## 3. Core Terms

### ObjectType

A reusable object definition. It contains:

- interface
- internal implementation
- composition
- later state
- later flow
- diagnostics contract

### ObjectInstance

An instance placed either in project `system` or inside another object's `composition`.

It contains:

- `type_ref`
- instance title
- parameter overrides
- project/local context

### Definition Scope

The context used to edit an `ObjectType`.

### System Scope

The context used to edit the installation where the user works only with `ObjectInstance`.

### Composition Scope

The internal assembly scope inside one object type.

## 4. Root Project Schema

```json
{
  "schema_version": "0.4.0",
  "meta": {
    "project_id": "boiler_house_a",
    "title": "Boiler House A"
  },
  "imports": {
    "libraries": [],
    "packages": []
  },
  "definitions": {
    "object_types": {}
  },
  "system": {
    "instances": {},
    "routes": {}
  },
  "hardware": {
    "bindings": {}
  },
  "views": {
    "screens": {}
  },
  "layouts": {
    "system": {},
    "definitions": {}
  }
}
```

## 5. Root Schema Rules

- `definitions`, `system`, `hardware`, `views` are required top-level sections.
- `layouts` store only editor/layout metadata, not semantic model.
- `imports` exist from the start as the future library/package anchor.
- Semantic model and layout state are strictly separated.

## 6. Schema: ObjectType

```json
{
  "id": "boiler_supervisor",
  "kind": "object_type",
  "meta": {
    "title": "Boiler Supervisor",
    "version": "1.0.0",
    "origin": "project"
  },
  "interface": {
    "ports": {},
    "params": {},
    "alarms": {}
  },
  "locals": {
    "signals": {},
    "vars": {}
  },
  "implementation": {
    "native": null,
    "composition": {
      "instances": {},
      "routes": {}
    },
    "state": null,
    "flow": null
  },
  "diagnostics": {}
}
```

### 6.1 Field Rules

`id`
- stable type identifier
- independent from display title

`meta`
- `title`
- `version`
- `origin = project | generated | imported`

`interface`
- public contract of the type
- contains `ports`, `params`, `alarms`

`locals`
- reserve for internal signals and vars
- may remain empty in `v1`

`implementation`
- one object contract contains all implementation modes
- in `v1`, only `composition` is fully active

`diagnostics`
- reserve for diagnostics contract and editor/build messages

## 7. Schema: Interface

### 7.1 Ports

```json
{
  "cmd_start": {
    "id": "cmd_start",
    "title": "Start Command",
    "direction": "in",
    "channel_kind": "command",
    "value_type": "bool"
  },
  "run_fb": {
    "id": "run_fb",
    "title": "Run Feedback",
    "direction": "out",
    "channel_kind": "state",
    "value_type": "bool"
  }
}
```

Rules:
- `id` is stable and unique inside `interface.ports`
- `direction = in | out`
- `channel_kind` is semantic: `signal`, `command`, `state`, `event`, `alarm`
- `value_type` is required
- display title is not part of reference resolution

### 7.2 Params

```json
{
  "purge_time": {
    "id": "purge_time",
    "title": "Purge Time",
    "value_type": "duration",
    "default": "30s"
  }
}
```

Rules:
- params are not route endpoints
- params are not edited through signal routing
- params are bound through `param_values` on instances

### 7.3 Alarms

In `v1`, alarms can exist as interface contract data without a dedicated graph editor.

## 8. Schema: ObjectInstance

```json
{
  "id": "boiler_supervisor_1",
  "kind": "object_instance",
  "type_ref": "project:boiler_supervisor",
  "title": "Boiler Supervisor #1",
  "enabled": true,
  "param_values": {
    "purge_time": {
      "kind": "literal",
      "value": "45s"
    }
  },
  "tags": {
    "zone": "boiler_room_1"
  }
}
```

Rules:
- every instance references a type through `type_ref`
- no autonomous interface is stored on the instance
- effective interface is resolved from `ObjectType`
- instance may store only title, enabled, param overrides and project/local annotations
- hardware bindings do not live in instance schema; they live in `project.hardware`

## 9. `type_ref` Format

Introduce namespaced refs such as:

- `project:boiler_supervisor`
- `generated:legacy_object_17`
- `package:boiler/burner_sequence`
- `library:std/pid_controller`

In `v1`, it is acceptable to support only:

- `project:*`
- `generated:*`
- `imported:*`

But the format should already be future-proof.

## 10. Composition v1

`Composition` is the first fully working internal authoring surface.

It describes internal assembly of an `ObjectType` from child instances and local routes.

```json
{
  "instances": {},
  "routes": {}
}
```

### 10.1 Child Instances in Composition

```json
{
  "burner_seq": {
    "id": "burner_seq",
    "kind": "object_instance",
    "type_ref": "project:burner_sequence",
    "title": "Burner Sequence",
    "param_values": {
      "purge_time": {
        "kind": "parent_param",
        "param_id": "purge_time"
      },
      "retry_limit": {
        "kind": "literal",
        "value": 2
      }
    }
  }
}
```

Rules:
- a child in composition is a normal `ObjectInstance`
- system instances and composition child instances share the same base contract
- only the scope differs

## 11. Unified Composition Route Model

```json
{
  "r1": {
    "id": "r1",
    "from": {
      "kind": "parent_port",
      "port_id": "cmd_start"
    },
    "to": {
      "kind": "instance_port",
      "instance_id": "burner_seq",
      "port_id": "cmd_start"
    }
  },
  "r2": {
    "id": "r2",
    "from": {
      "kind": "instance_port",
      "instance_id": "burner_seq",
      "port_id": "run_fb"
    },
    "to": {
      "kind": "parent_port",
      "port_id": "run_fb"
    }
  }
}
```

### 11.1 Endpoint kinds in Composition v1

Allowed kinds:
- `parent_port`
- `instance_port`

`parent_port`

```json
{
  "kind": "parent_port",
  "port_id": "run_fb"
}
```

`instance_port`

```json
{
  "kind": "instance_port",
  "instance_id": "burner_seq",
  "port_id": "run_fb"
}
```

### 11.2 Forbidden in Composition v1

- routes to grandchildren
- routes to neighboring scopes
- routes to params
- routes to hardware bindings
- routes to view elements

## 12. Direction and Boundary Rules

Allowed cases:
- `parent_port(out) -> instance_port(in)`
- `instance_port(out) -> instance_port(in)`
- `instance_port(out) -> parent_port(in)` when parent boundary is interpreted from the inside

Boundary interpretation rule:
- parent `in` behaves as an internal source for child logic
- parent `out` behaves as an internal sink for child outputs

This should be fixed at elaboration/view-model level so the UI remains intuitive.

## 13. Multiplicity Rules

For `Composition v1`:
- one output may fan out into multiple inputs
- one input may have only one source
- multiple drivers on one input are an error
- unconnected output is allowed
- unconnected required input is warning or error depending on port policy

## 14. Param Binding Model

Params do not use routes.

Supported values:

Literal:
```json
{
  "kind": "literal",
  "value": 2
}
```

Parent param:
```json
{
  "kind": "parent_param",
  "param_id": "purge_time"
}
```

Later additions may include expressions, constant refs, or package presets, but not in `Composition v1`.

## 15. Layout Model

Layout is stored separately from semantic schema.

```json
{
  "layouts": {
    "definitions": {
      "boiler_supervisor": {
        "composition": {
          "nodes": {
            "burner_seq": {
              "x": 480,
              "y": 220,
              "w": 220,
              "h": 120
            }
          },
          "viewport": {
            "x": 0,
            "y": 0,
            "zoom": 1
          }
        }
      }
    }
  }
}
```

Rules:
- child coordinates do not live in `implementation.composition.instances`
- layout does not affect semantic build
- editor must survive reload without changing semantic JSON

## 16. Navigation Model

Top-level project navigation becomes:

- `Definitions`
- `System`
- `Hardware`
- `Views`

Rule:
- the old `System / Objects` world should be gradually renamed to `System / Instances`

## 17. UI: Definitions Section

`Definitions` becomes a first-class project section.

Left panel groups:
- `Project Types`
- `Generated Types`
- `Imported Types`

Center:
- `Object Definition Studio`

Breadcrumb examples:
- `Project / Definitions / Boiler Supervisor / Interface`
- `Project / Definitions / Boiler Supervisor / Composition`

Surface tabs:
- `Interface`
- `Composition`
- `State`
- `Flow`
- `Diagnostics`

## 18. UI: Definition Studio

`Interface`
- working editor for `ports`, `params`, `alarms`

`Composition`
- first fully functional graphic authoring surface

`State`
- shell / readiness surface in the first milestone

`Flow`
- shell / readiness surface in the first milestone

`Diagnostics`
- working surface for validation/errors/warnings

## 19. UI: System Behavior

At system level the user works only with instances.

Behavior:
- single click: select instance
- double click: open `Instance Overview`
- do not jump directly into type definition automatically

## 20. UI: Instance Overview

`Instance Overview` is the required layer between instance and type.

It shows:
- header: instance title, instance id, type ref, origin badge
- effective interface summary
- parameter overrides
- route participation summary
- hardware summary
- views summary

Primary actions:
- `Open Type`
- `Locate on System Canvas`
- `Reveal Routes`

Why it exists:
- because an instance is not just a shortcut to a type; it has project-level context

## 21. UI: Composition Surface

`Composition` should not be built as an entirely separate editor. It should reuse a common `AssemblySurface`.

`AssemblySurface` becomes shared between:
- `System`
- `Definition / Composition`

Reusable editor primitives:
- canvas host
- selection model
- inspector
- routing gestures
- link mirror
- layout persistence
- diagnostics overlay

What changes is only the data adapter:
- `system adapter`
- `composition adapter`

## 22. Composition Surface Layout

Left:
- palette / add child instance

Center:
- canvas with child instances

Boundary rails:
- left: parent inputs
- right: parent outputs

Params are not shown as route nodes. They are edited in the selected child inspector.

Right:
- selection-driven inspector

Bottom:
- validation strip / diagnostics summary

## 23. Inspector Behavior

If a child instance is selected, show:
- id
- title
- `type_ref`
- effective interface
- `param_values`
- route summary
- action `Open Child Type`

If a parent port is selected, show:
- port meta
- port direction
- all internal mappings
- warnings

If a route is selected, show:
- source
- target
- resolved types
- compatibility
- diagnostics

## 24. State and Flow Shells

Even before full authoring exists, `State` and `Flow` should appear as explicit studio surfaces.

`State` shell shows:
- status: planned
- v1 constraint: one state machine per object
- v1 constraint: no parallel regions

`Flow` shell shows:
- status: planned
- v1 constraint: named graphs
- v1 constraint: acyclic data logic
- v1 constraint: stateful blocks only explicit

This stabilizes the mental model early.

## 25. Diagnostics Surface

`Diagnostics` should be a real, useful surface in the first milestone.

It should show:
- schema errors
- unresolved refs
- missing types
- missing ports
- direction mismatches
- multi-driver conflicts
- migration warnings

It becomes the first visible interface of `semantic build`, even before runtime.

## 26. Transition Layer for Legacy Model

A hard model break is rejected.

Strategy:
- legacy projects open through a compatibility adapter

Adaptation rule:
- each legacy object is transformed into:
  - one generated `ObjectType`
  - one `ObjectInstance` pointing to it

So a legacy object becomes an inline-local type + instance pair.

## 27. Generated Types

Generated types must be visible in `Definitions` as a separate group:
- `Generated Types`

Potential later actions:
- rename generated type
- promote to project type
- extract shared type
- merge similar types

These actions are outside the first milestone.

## 28. Migration Policy

On read:
- legacy schema is adapted into the new in-memory model

On save:
- the new format is written only after explicit migration or save into the new schema version

Why:
- keeps control over format changes and makes diffs predictable

## 29. Validation Rules for the Milestone

`Composition v1` must validate:
- `type_ref` exists
- referenced child exists
- referenced port exists
- endpoint kind is legal for the current scope
- route direction is valid
- `value_type` is compatible
- one input does not have multiple drivers
- `parent_param` references an existing parent param
- child `param_values` do not contain unknown params
- layout does not contain orphan node ids

## 30. Semantic Build / Elaboration v1

After editor/model stabilization the project gains `semantic build`.

Input:
- raw project model

Output:
- resolved model / elaborated snapshot

`semantic build` responsibilities:
- schema validation
- ref resolution
- type resolution
- interface expansion for instances
- composition hierarchy expansion
- route endpoint typing
- cycle checks where applicable
- diagnostics production

What it does not do yet:
- runtime scheduling
- code generation
- PLC execution backend

## 31. First Artifacts of Semantic Build

Initial outputs should include:
- resolved instance interface
- resolved composition map
- structured diagnostics report

## 32. Milestone Scope

Milestone name:
- `Definition Shell + Composition v1`

Included:

Model:
- new root schema sections
- `ObjectType`
- `ObjectInstance`
- `type_ref`
- composition schema
- layout separation

UI:
- `Definitions` section
- `Definition Studio` shell
- `Instance Overview`
- `Composition` editor on top of `AssemblySurface`

Compatibility:
- legacy adapter
- generated local types

Validation:
- composition validation
- diagnostics surface

## 33. Out of Scope

Explicitly excluded:
- `Flow editor v1`
- `State editor v1`
- runtime
- compiler backend
- inheritance
- hardware authoring redesign
- views redesign
- alarm graph editor
- direct child-internal access from system scope

## 34. Acceptance Criteria

The milestone is successful if a user can:
1. create an `ObjectType` in `Definitions`
2. add ports and params in `Interface`
3. enter `Composition`
4. add child instances
5. configure child param values
6. connect:
   - `parent -> child`
   - `child -> child`
   - `child -> parent`
7. create a system `ObjectInstance` referencing that type
8. open `Instance Overview` on double click
9. navigate from overview to `Open Type`
10. save and reload the project without losing:
   - IDs
   - `type_ref`s
   - routes
   - layouts

## 35. Recommended Implementation Order

Slice 1. Model foundation
- root schema
- `ObjectType`
- `ObjectInstance`
- `type_ref`
- basic migration adapter

Slice 2. Definitions UI shell
- `Definitions` section
- `Definition Studio` tabs
- basic `Interface` editor

Slice 3. Instance Overview
- double click behavior
- overview panel/page
- `Open Type` flow

Slice 4. Composition v1
- `AssemblySurface` abstraction
- composition data adapter
- parent boundary rails
- local routes
- inspector
- validation

Slice 5. Diagnostics surface
- structured error model
- validation strip
- diagnostics panel

## 36. Architectural Prohibitions

To protect the model, the following are forbidden in this phase:
- one shared canvas for system + composition + state + flow
- mixing params and signal routes
- hardware bindings inside type definitions
- system-scope access to child internals bypassing interface
- inheritance before composition/state/flow stabilization
- jumping directly to runtime while skipping semantic build

## 37. Canonical Boiler Scenario

At system level there are instances such as:
- `boiler_supervisor_1`
- `steam_pressure_control_1`
- `trip_group_1`

Inside `boiler_supervisor` through `Composition` there are child instances such as:
- `burner_sequence`
- `safety_chain`
- `valve_train`

Later, inside `burner_sequence`, `State` appears.

This is the intended hierarchy:
- `System` assembles the installation
- `Composition` assembles the object
- `State` manages phases of the object
- `Flow` implements actions and calculations

## 38. Final Formula

`universal_plc` moves from a system-only assembly editor to a hierarchical object authoring platform.

The first concrete step of this transition is:
- `ObjectType + ObjectInstance + Definition Studio + Composition v1`

## 39. Minimal TypeScript Contract

```ts
type TypeRef = string;

type PortDirection = "in" | "out";
type ChannelKind = "signal" | "command" | "state" | "event" | "alarm";

interface ProjectModel {
  schema_version: string;
  meta: {
    project_id: string;
    title: string;
  };
  imports: {
    libraries: string[];
    packages: string[];
  };
  definitions: {
    object_types: Record<string, ObjectType>;
  };
  system: {
    instances: Record<string, ObjectInstance>;
    routes: Record<string, SystemRoute>;
  };
  hardware: {
    bindings: Record<string, unknown>;
  };
  views: {
    screens: Record<string, unknown>;
  };
  layouts: {
    system: Record<string, unknown>;
    definitions: Record<string, unknown>;
  };
}

interface ObjectType {
  id: string;
  kind: "object_type";
  meta: {
    title: string;
    version?: string;
    origin: "project" | "generated" | "imported";
  };
  interface: {
    ports: Record<string, PortDef>;
    params: Record<string, ParamDef>;
    alarms: Record<string, AlarmDef>;
  };
  locals: {
    signals: Record<string, unknown>;
    vars: Record<string, unknown>;
  };
  implementation: {
    native: unknown | null;
    composition: CompositionModel | null;
    state: unknown | null;
    flow: unknown | null;
  };
  diagnostics: Record<string, unknown>;
}

interface ObjectInstance {
  id: string;
  kind: "object_instance";
  type_ref: TypeRef;
  title?: string;
  enabled?: boolean;
  param_values?: Record<string, ParamValue>;
  tags?: Record<string, string>;
}

interface PortDef {
  id: string;
  title?: string;
  direction: PortDirection;
  channel_kind: ChannelKind;
  value_type: string;
  required?: boolean;
}

interface ParamDef {
  id: string;
  title?: string;
  value_type: string;
  default?: unknown;
}

interface AlarmDef {
  id: string;
  title?: string;
  severity?: string;
}

interface CompositionModel {
  instances: Record<string, ObjectInstance>;
  routes: Record<string, CompositionRoute>;
}

type CompositionEndpoint =
  | {
      kind: "parent_port";
      port_id: string;
    }
  | {
      kind: "instance_port";
      instance_id: string;
      port_id: string;
    };

interface CompositionRoute {
  id: string;
  from: CompositionEndpoint;
  to: CompositionEndpoint;
}

type ParamValue =
  | {
      kind: "literal";
      value: unknown;
    }
  | {
      kind: "parent_param";
      param_id: string;
    };

interface SystemRoute {
  id: string;
  from: unknown;
  to: unknown;
}
```

## 40. Companion Implementation Spec

The implementation breakdown that complements this ADR lives in:
- [definition-studio-composition-v1-breakdown.md](/c:/Users/Administrator/Documents/PlatformIO/Projects/universal_plc/docs/specs/definition-studio-composition-v1-breakdown.md)

This ADR is the accepted architectural baseline. The breakdown document carries the implementation slices, store plan, adapter pattern, validation/build pipeline and milestone execution order.
