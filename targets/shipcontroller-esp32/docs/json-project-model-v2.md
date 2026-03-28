# JSON Project Model v2

## Purpose

This document defines the first editor-first project model that should sit between:

- visual editor
- compiler/materializer
- existing runtime engine

It intentionally does not replace the runtime source of truth yet.

Its role is:

- hold project authoring intent
- describe state/flow structure
- become the future compiler input

## Core Rule

The editor should no longer render only from hardcoded reference graphs.

It should render from:

- `project_model_v2`

Reference presets may still exist, but only as loaders for that model.

## Minimal Shape

```json
{
  "version": "project_model_v2",
  "id": "test1",
  "label": "Test 1: Button -> Timer -> Relay",
  "summary": "Minimal reference project",
  "project": ["Проект", "Main"],
  "root_flow": "main_flow",
  "state_machine": {
    "enabled": false,
    "states": [],
    "transitions": []
  },
  "flows": {},
  "compiler": {
    "target": "existing_runtime",
    "generated_preview": false
  },
  "metadata": {
    "source": "editor_preset",
    "preset_id": "test1"
  }
}
```

## Required Fields

### Top Level

- `version`
- `id`
- `label`
- `summary`
- `project`
- `root_flow`
- `state_machine`
- `flows`
- `compiler`
- `metadata`

### `project`

Represents human-facing project path.

Examples:

- `["Проект", "Main"]`
- `["Проект", "Boiler"]`

### `state_machine`

Contains orchestration-layer information.

Fields:

- `enabled`
- `states`
- `transitions`

If the project is simple flow-only logic:

- `enabled` may be `false`
- `states` may still contain a root state such as `Main`

### `flows`

Map of flow ids to flow definitions.

Each flow contains:

- `title`
- `explain`
- `nodes`
- `edges`

## Node Shape

```json
{
  "id": "logic_timer",
  "lane": "logic",
  "type": "timer",
  "title": "Таймер",
  "subtitle": "pulse / delay / interval",
  "inputs": ["enable", "reset"],
  "outputs": ["active", "running"],
  "status": "ready"
}
```

## Edge Shape

```json
{
  "from": "src_button",
  "fromPort": "state",
  "to": "logic_timer",
  "toPort": "enable",
  "kind": "event"
}
```

## State Shape

```json
{
  "id": "purge",
  "label": "PURGE",
  "kind": "state",
  "status": "active",
  "flow": "purge_flow"
}
```

## Transition Shape

```json
{
  "from": "idle",
  "to": "purge",
  "label": "start + permissive"
}
```

## Near-Term Compiler Contract

The future compiler should translate:

- project model
- selected flows
- state machine structure

into:

- generated signals
- generated blocks
- generated sequences
- generated links and ownership metadata

## Current Live Implementation

The current implementation step is intentionally small:

- `project_model_v2` now exists as an in-memory editor model
- current reference demos load into that model
- the editor renders from that model
- generated internals preview is still placeholder-only

This is enough to start replacing hardcoded editor assumptions with a real authoring model.
