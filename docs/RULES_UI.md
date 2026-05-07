# Rules UI

## Purpose

Stage 13 adds the first narrow Rules UI for mechanics, commissioning and service work.

This page is intentionally focused on background rules and must answer:
- what rules exist
- which rules are active, inactive, disabled or error
- why a rule is currently in that state
- what condition tree the rule uses
- what happens in `on_true`, `while_true` and `on_false`
- why a save failed when validation rejects a draft

The page is not a generic config editor and does not duplicate Logic Engine runtime behavior.

## Hardware Scope

The transport-neutral Rules UI contract supports create/update/delete/enable/disable flows in host-side tests and future tooling.

The supported on-device RC surface is narrower:
- `GET /rules`
- `GET /api/rules/list`
- `GET /api/rules/{id}`
- read-only list/detail/trace only on hardware
- no rule mutation routes exposed on the device

## Why Form-Based

The Rules UI is form-based instead of graph-based because Stage 13 is meant to be narrow, deterministic and service-friendly.

This gives us:
- smaller embedded assets
- simpler host-side testing
- explicit validation paths
- stable transport-neutral DTOs
- no dependency on a heavy frontend framework

Graph editing, simulations and bulk tooling are postponed until the runtime/admin contract is stable enough to support them cleanly.

## Layers

Stage 13 adds three layers:

1. `LogicService` narrow admin methods
   - `replace_rule(rule_id, new_descriptor, now_ms)`
   - `remove_rule(rule_id, now_ms)`
   - `set_rule_enabled(rule_id, enabled, now_ms)`

2. `RulesApiService`
   - typed list/detail/catalog DTOs
   - structured validation issue preservation
   - mutation argument validation through `CommandContext`
   - no duplicated condition or rule execution logic

3. `WebRulesAdapter`
   - list cards for the left panel
   - flattened condition builder model
   - sectioned action builder model
   - trace lines and current status shaping for the static page

## Page Layout

`webui/rules/index.html` is a single-page static shell with:
- validation and message banners
- a read-only hardware status banner plus host-side editor affordances
- rule list/status cards
- metadata form
- condition builder
- action builder
- current evaluation trace

No router, SPA shell or multi-page navigation is required in this stage.
On hardware, the Stage 30 RC binding keeps the page in read-only mode.

## List And Detail Model

Rule cards show:
- id and name
- enabled/active-derived status
- activation counters and transition time
- compact IF summary
- compact action summary

Detail/editor payload includes:
- metadata
- raw draft model
- current runtime status
- current condition trace
- validation issues
- flattened condition node list for nested rendering
- action sections with allowed kind lists

## Current Trace

The page shows the current trace produced by `LogicService` and `ConditionEvaluator`.

Each trace line exposes:
- node id
- node kind
- raw result
- effective result
- reason
- signal path when relevant
- value summary when available

This is a live explanation view, not a freeform simulator.

## Create, Update, Delete, Enable, Disable

Mutation flows remain narrow and explicit:

- create
  - validates the draft first
  - registers the rule only if validation succeeds

- update
  - validates the replacement draft first
  - clears persistent requests owned by the active rule before the replacement runs
  - resets runtime state so the replacement does not auto-fire until the next tick

- delete
  - requires explicit confirmation in the static page
  - clears owned persistent requests before removing the rule

- disable
  - clears owned persistent requests
  - resets runtime state
  - does not fire `on_false`

- enable
  - reenables evaluation
  - does not auto-fire until the next normal tick evaluation

## Validation And Errors

The Rules API and adapter keep structured validation issues all the way to the page.

Stable result codes include:
- `RULES_UI_OK`
- `RULES_UI_RULE_NOT_FOUND`
- `RULES_UI_SAVE_DENIED`
- `RULES_UI_DELETE_DENIED`
- `RULES_UI_ENABLE_DENIED`
- `RULES_UI_DISABLE_DENIED`
- `RULES_UI_INVALID_ARGUMENT`
- `RULES_UI_VALIDATION_FAILED`
- `RULES_UI_DATA_UNAVAILABLE`

Validation issues carry:
- `path`
- `code`
- `message`

The static page shows them both as a banner summary and as detail-bound issues when present.

## Postponed

Still intentionally postponed beyond Stage 13:
- graph/node editor
- textual expression parser
- sandbox/simulation UI
- schedule/calendar rules
- Flow, PID or Program editor pages
- auth/roles
- MQTT UI
- generic config CRUD framework
- bulk rule editing/import tooling
