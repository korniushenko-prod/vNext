# Templates

## Purpose

Stage 23 adds a dedicated Template Engine that generates safe runtime bundles across existing services:
- Sequence programs
- Logic rules
- Alarm descriptors
- PID descriptors

This is intentionally different from Stage 20 Program Builder:
- Stage 20 creates one safe skeleton program
- Stage 23 creates a curated multi-artifact bundle from a typed draft

The Template Engine is not a generic config editor.
It is a curated library of known patterns that map onto existing runtime services.

## Supported Template Kinds

Stage 23 supports:
- `pressure_pump`
- `pump_with_flowmeter`
- `batch_dosing`
- `pid_pressure_pwm_pump`
- `pid_flow_pwm_pump`
- `compressor_basic`
- `burner_supervisory_skeleton`
- `incinerator_supervisory_skeleton`

Burner and incinerator templates are clearly marked supervisory-only.
They generate review skeletons, not certified combustion or burner-management logic.

## Typed Draft And Schema Model

Each template is driven by a typed `TemplateDraft`:
- `instance_id`
- `template_kind`
- `display_name`
- `bindings`
- `parameters`
- `create_disabled`
- optional `notes`

Each template kind exposes typed slot and parameter schemas:
- semantic slot ids
- required vs optional bindings
- expected signal, actuator, timer or alarm constraints
- preferred actuator roles where applicable
- typed parameters with required flags and range constraints

The catalog is assembled from runtime services:
- `SignalRegistry`
- `ActuatorManager`
- `TimerService`
- `AlarmService`
- existing program, rule and PID ids for collision checks

## Preview And Validation Flow

Preview works without applying anything.

Validation runs before both preview and apply.
It rejects at minimum:
- unsupported template kind
- empty `instance_id` or `display_name`
- duplicate resulting ids
- missing required bindings
- missing required parameters
- wrong signal type for a slot
- wrong actuator kind for a slot
- invalid parameter ranges
- active program present on apply
- unsafe create-enabled requests

Validation returns structured issues with:
- `path`
- `code`
- `severity`
- `message`

Preview returns:
- draft summary
- validation issues
- generated bundle summary
- generated state lists for programs
- generated rule, alarm and PID summaries
- warnings
- `apply_allowed`
- `will_create_disabled`

If the draft is invalid, preview still returns as much safe preview data as possible.

## Safe Apply Rules

Stage 23 is safe by default:
- generated programs are created disabled
- generated rules are created disabled
- generated PID controllers are created disabled
- alarms may be created enabled
- nothing auto-starts
- nothing auto-enables after apply
- apply is denied while any Sequence program is active

The backend also rejects unsafe `create_disabled = false` requests in this stage.

## Generated Id Policy

Generated artifact ids are deterministic and namespaced by `instance_id`:
- programs: `<instance_id>.program.<name>`
- rules: `<instance_id>.rule.<name>`
- alarms: `<instance_id>.alarm.<name>`
- pids: `<instance_id>.pid.<name>`

This keeps preview stable, collisions predictable and rollback straightforward.

## Rollback Semantics

Apply registers generated artifacts in deterministic order:
1. alarms
2. PID descriptors
3. rules
4. programs

If any registration fails partway through:
- apply is rejected
- rollback runs in reverse order
- already-created artifacts are removed
- rollback issues are surfaced in a structured result if cleanup is incomplete

Stage 23 does not add template unapply/delete.
Rollback exists only for partial apply failure handling.

## Transport-Neutral API And Web Surface

Stage 23 adds:
- `TemplateEngine`
- `TemplateApiService`
- `WebTemplateAdapter`
- static `webui/templates/*`

No real HTTP server is added in this stage, but the intended logical mapping is:
- `GET /ui/templates/catalog`
- `GET /ui/templates/schema/{kind}`
- `POST /ui/templates/preview`
- `POST /ui/templates/apply`

The templates page stays plain HTML, CSS and JavaScript only.

## What Is Postponed

Stage 23 intentionally does not implement:
- template unapply/delete
- template persistence or import/export
- graph editor
- generic config CRUD
- HTTP server
- MQTT
- auth or roles
- certified burner logic
- full template library expansion beyond the supported Stage 23 list
