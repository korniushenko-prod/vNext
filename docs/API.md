# API

## Purpose

Stage 10 adds a transport-neutral API layer for the Sequence Engine.

`SequenceApiService` is the typed backend facade that dashboard adapters and the narrow on-device HTTP routing call.
In this stage it remains an ordinary C++ service object with no socket, HTTP, JSON or ESP-IDF dependency.

This keeps the contract:
- host-side testable
- portable C++17
- thin over existing runtime services
- stable enough to wrap in HTTP later

Stage 28 now adds a narrow embedded HTTP binding on the ESP32 target while preserving the transport-neutral adapter/service split.

## Stage 28 embedded HTTP binding

The on-device HTTP server binds existing adapters and serves only this limited Stage 28 surface:

- pages:
  - `GET /`
  - `GET /flow`
  - `GET /rules`
- dashboard routes:
  - `GET /api/dashboard/data`
  - `POST /api/dashboard/start`
  - `POST /api/dashboard/stop`
  - `POST /api/dashboard/trip`
  - `POST /api/dashboard/reset`
- flow routes:
  - `GET /api/flow/list`
  - `GET /api/flow/{id}/status`
  - `GET /api/flow/{id}/trend`
  - `GET /api/flow/{id}/history`
  - `POST /api/flow/{id}/batch/start`
  - `POST /api/flow/{id}/batch/stop`
  - `POST /api/flow/{id}/batch/reset`
  - `POST /api/flow/{id}/trip-total/reset`
- rules routes:
  - `GET /api/rules/list`
  - `GET /api/rules/{id}`

Stage 28 intentionally does not bind rule mutation routes on hardware.

## Why HTTP Stayed Narrow

The controller still needs the broader API contract to settle before a full transport stack is worth adding.
Stage 28 therefore binds only the minimum safe dashboard, flow and read-only rules surface.

## Stage 21 logical editor endpoints

Stage 21 adds typed editor-facing contracts for these logical routes:
- `GET /ui/program-editor/list`
- `GET /ui/program-editor/{id}`
- `GET /ui/program-editor/catalog`
- `POST /ui/program-editor/{id}/preview`
- `POST /ui/program-editor/{id}/save`
- `POST /ui/program-editor/{id}/delete`
- `POST /ui/program-editor/{id}/enable`
- `POST /ui/program-editor/{id}/disable`

No HTTP server is introduced in this stage. These are transport-neutral service and adapter contracts only.

Stage 10 intentionally does not implement:
- HTTP routing
- JSON serialization or parsing
- MQTT
- browser UI pages in that initial stage
- authentication
- persistence

Future transport code should adapt the DTOs from this document instead of reaching into `SequenceService` directly.

Stage 11 adds a second thin layer, `WebDashboardAdapter`, which keeps the dashboard-specific mapping separate from both runtime services and future HTTP transport code.
Stage 13 extends the same transport-neutral approach to Rules UI with `RulesApiService` and `WebRulesAdapter`.
Stage 20 extends the same transport-neutral approach to the Program Builder Wizard with `ProgramBuilderApiService` and `WebProgramBuilderAdapter`.
Stage 22 extends it again with `ProgramMatrixApiService` and `WebProgramMatrixAdapter` for read-only sequence output-matrix visualization.
Stage 23 extends it again with `TemplateApiService` and `WebTemplateAdapter` for safe multi-service bundle generation.
Stage 24 adds a separate transport-neutral MQTT bridge that consumes these runtime services directly rather than layering MQTT on top of future HTTP routes.

## Service Shape

`SequenceApiService` depends on:
- `SequenceService`
- `AlarmService`
- `ActuatorManager`

It does not reimplement sequence execution logic.
It only:
- validates API arguments
- delegates commands
- translates snapshots and history into API DTOs
- aggregates alarm and actuator summaries into program status views

Stage 20 adds `ProgramBuilderApiService`, which depends on:
- `ProgramSkeletonBuilder`
- `SequenceService`
- runtime catalog sources exposed through `SignalRegistry`, `ActuatorManager`, `TimerService` and `AlarmService`

It does not implement HTTP transport.
It only:
- exposes builder catalog data
- creates typed empty drafts
- validates and previews drafts
- registers disabled skeleton programs into `SequenceService`

Stage 22 adds `ProgramMatrixApiService`, which depends on:
- `SequenceService`
- `ActuatorManager`
- `ProgramMatrixBuilder`

It does not implement HTTP transport.
It only:
- lists available programs for matrix selection
- builds typed program-matrix DTOs from registered descriptors
- attaches compact runtime summary data for active-row highlighting
- returns structured no-program and no-active-program responses

Stage 23 adds `TemplateApiService`, which depends on:
- `TemplateEngine`
- `SignalRegistry`
- `ActuatorManager`
- `TimerService`
- `AlarmService`
- `LogicService`
- `SequenceService`
- `PIDService`

It does not implement HTTP transport.
It only:
- exposes template catalog and per-kind schemas
- creates typed template drafts
- validates and previews drafts
- applies generated bundles through the existing runtime services
- preserves structured validation and rollback errors

## Future Program Builder Endpoint Mapping

Stage 20 does not add real HTTP routing, but the intended logical mapping is:

- `GET /ui/program-builder/catalog`
- `POST /ui/program-builder/preview`
- `POST /ui/program-builder/create`

Those future handlers should call `ProgramBuilderApiService` and `WebProgramBuilderAdapter` instead of reaching into runtime services directly.

## Future Program Matrix Endpoint Mapping

Stage 22 does not add real HTTP routing, but the intended logical mapping is:

- `GET /ui/program-matrix/list`
- `GET /ui/program-matrix/{id}`
- `GET /ui/program-matrix/active`

Those future handlers should call `ProgramMatrixApiService` and `WebProgramMatrixAdapter` instead of reaching into runtime services directly.

## Future Template Endpoint Mapping

Stage 23 does not add real HTTP routing, but the intended logical mapping is:

- `GET /ui/templates/catalog`
- `GET /ui/templates/schema/{kind}`
- `POST /ui/templates/preview`
- `POST /ui/templates/apply`

Those future handlers should call `TemplateApiService` and `WebTemplateAdapter` instead of reaching into runtime services directly.

## DTOs

### CommandContext

All command methods require `CommandContext`:
- `now_ms`
- `source`
- `reason`
- optional `actor`

Validation rules:
- `source` must be non-empty
- `reason` must be non-empty
- `now_ms` is always explicit

Stage 13 reuses the same typed `CommandContext` for Rules UI mutations.

### ProgramSummaryDto

Returned by `list_programs(now_ms)`.

Fields:
- `id`
- `name`
- `type`
- `enabled`
- `is_active`
- optional `lifecycle`
- optional `current_state`
- optional `lockout`

Ordering is deterministic and matches `SequenceService` registration order.

### ProgramStatusDto

Returned by:
- `get_active_program_status(now_ms)`
- `get_program_status(program_id, now_ms)`

Core fields:
- optional `program_id`
- `program_registered`
- `is_active`
- `enabled`
- `name`
- `type`
- optional `active_program_id`
- `lifecycle`
- optional `current_state_id`
- optional `previous_state_id`
- `current_state_type`
- `state_elapsed_ms`
- `pending_normal_stop`
- `pending_trip`
- `lockout`
- `can_start`
- `can_reset`
- `last_reason`
- `transition_candidates`
- `active_alarms`
- `actuators`

Behavior notes:
- `get_active_program_status(now_ms)` returns success with coherent idle status when no program is active.
- `get_program_status(program_id, now_ms)` returns success for an inactive but registered program.
- unknown `program_id` returns a structured API error.

### TransitionCandidateDto

Program status exposes ordered transition candidates with:
- `transition_id`
- `target_state_id`
- `eligible`
- `reason`
- `min_time_satisfied`
- optional `condition_effective_result`

Ordering matches `SequenceService` transition evaluation order.

### AlarmSummaryDto

Program status includes aggregate alarm information with:
- `any_active`
- `trip_active`
- `safety_active`
- `active_count`
- optional `highest_severity`
- optional `highest_severity_alarm_id`
- `active_alarm_ids`

### ActuatorSummaryDto

Program status includes effective actuator state summaries with:
- `id`
- `kind`
- `role`
- `safe_fallback`
- `owner`
- `reason`
- `priority`
- optional `relay_state`
- optional `pwm_enabled`
- optional `pwm_duty_percent`

This is the dashboard-facing explanation layer for:
- what output is active
- why it is active
- whether it is currently in safe fallback

### ProgramHistoryEntryDto

History queries return oldest-first entries with:
- `sequence_number`
- `program_id`
- `event_type`
- optional `from_state`
- optional `to_state`
- `timestamp_ms`
- `source`
- `reason`

History ordering is intentionally oldest-first to match the internal `SequenceHistoryBuffer` order.

### CommandResultDto

Command methods return:
- `accepted`
- `code`
- `message`
- optional `active_program_id`
- optional `lifecycle`
- optional `current_state_id`
- optional `can_reset`
- optional embedded `status`

The embedded status is included when it can be produced cheaply from the current runtime snapshot.

## Error Philosophy

The API layer uses stable API-facing result codes instead of leaking raw exceptions.

Current API codes:
- `OK`
- `API_PROGRAM_NOT_FOUND`
- `API_NO_ACTIVE_PROGRAM`
- `API_PROGRAM_INACTIVE`
- `API_START_DENIED`
- `API_STOP_DENIED`
- `API_TRIP_DENIED`
- `API_RESET_DENIED`
- `API_SEQUENCE_SERVICE_ERROR`
- `API_INVALID_ARGUMENT`
- `API_HISTORY_UNAVAILABLE`
- `API_INTERNAL_MAPPING_ERROR`

Key distinctions:
- unknown program id is different from inactive registered program
- no active program is different from command denial
- invalid API arguments are different from underlying sequence/runtime failures
- lower-level runtime integration failures are surfaced as `API_SEQUENCE_SERVICE_ERROR`

## Future Endpoint Mapping

The following mapping is the planned HTTP-facing contract.
Stage 10 documents it only; no routing is implemented yet.

### `GET /api/programs`

Purpose:
- list all registered programs
- mark the active program clearly

Response:
- `ApiResult<std::vector<ProgramSummaryDto>>`

Expected errors:
- `API_INTERNAL_MAPPING_ERROR`

### `GET /api/programs/active`

Purpose:
- return dashboard-friendly status for the currently active program

Response:
- `ApiResult<ProgramStatusDto>`

Behavior:
- when no program is active, this still returns success with idle status

Expected errors:
- `API_INTERNAL_MAPPING_ERROR`
- `API_SEQUENCE_SERVICE_ERROR` if an unexpected runtime lookup fails

### `GET /api/programs/{id}/status`

Purpose:
- return status for a specific registered program

Response:
- `ApiResult<ProgramStatusDto>`

Behavior:
- inactive but registered program returns success with `is_active=false`
- unknown `id` returns `API_PROGRAM_NOT_FOUND`

Expected errors:
- `API_PROGRAM_NOT_FOUND`
- `API_INVALID_ARGUMENT`
- `API_INTERNAL_MAPPING_ERROR`

### `GET /api/programs/{id}/history`

Purpose:
- return bounded oldest-first history for one program

Response:
- `ApiResult<std::vector<ProgramHistoryEntryDto>>`

Behavior:
- empty history is a successful empty list
- unknown `id` returns `API_PROGRAM_NOT_FOUND`

Expected errors:
- `API_PROGRAM_NOT_FOUND`
- `API_INVALID_ARGUMENT`

### `POST /api/programs/{id}/start`

Purpose:
- request program start with explicit command context

Response:
- `CommandResultDto`

Expected errors:
- `API_PROGRAM_NOT_FOUND`
- `API_INVALID_ARGUMENT`
- `API_START_DENIED`
- `API_SEQUENCE_SERVICE_ERROR`

### `POST /api/programs/active/stop`

Purpose:
- request normal stop for the active program

Response:
- `CommandResultDto`

Expected errors:
- `API_NO_ACTIVE_PROGRAM`
- `API_INVALID_ARGUMENT`
- `API_STOP_DENIED`
- `API_SEQUENCE_SERVICE_ERROR`

### `POST /api/programs/active/trip`

Purpose:
- request trip stop for the active program

Response:
- `CommandResultDto`

Expected errors:
- `API_NO_ACTIVE_PROGRAM`
- `API_INVALID_ARGUMENT`
- `API_TRIP_DENIED`
- `API_SEQUENCE_SERVICE_ERROR`

### `POST /api/programs/active/reset`

Purpose:
- request reset for the active program

Response:
- `CommandResultDto`

Expected errors:
- `API_NO_ACTIVE_PROGRAM`
- `API_INVALID_ARGUMENT`
- `API_RESET_DENIED`
- `API_SEQUENCE_SERVICE_ERROR`

## Dashboard Transport Contract

Stage 28 binds the dashboard adapter on-device at:
- `GET /api/dashboard/data`
- `POST /api/dashboard/start`
- `POST /api/dashboard/stop`
- `POST /api/dashboard/trip`
- `POST /api/dashboard/reset`

`WebDashboardAdapter` depends on `SequenceApiService` and returns dashboard-oriented responses with:
- stable dashboard result codes
- refresh timestamp
- command acceptance/message
- registered program list for simple start selection
- current program, state, blockers, alarms, actuators and recent history

Dashboard-facing result codes include:
- `DASHBOARD_OK`
- `DASHBOARD_NO_ACTIVE_PROGRAM`
- `DASHBOARD_START_DENIED`
- `DASHBOARD_STOP_DENIED`
- `DASHBOARD_TRIP_DENIED`
- `DASHBOARD_RESET_DENIED`
- `DASHBOARD_API_ERROR`
- `DASHBOARD_INVALID_ARGUMENT`
- `DASHBOARD_DATA_UNAVAILABLE`

The adapter remains transport-neutral:
- no socket ownership
- no ESP-IDF server dependency
- no generic JSON framework requirement in this stage

## Rules UI Transport Contract

Stage 13 adds a second UI-facing contract for background rules.

`RulesApiService` owns:
- typed rule list, detail and editor catalog DTOs
- rule create/update/delete/enable/disable validation
- structured validation issue preservation
- deterministic summary generation for cards/detail

`WebRulesAdapter` owns:
- rule card list view model
- flattened form-builder condition model
- sectioned action editor model
- current trace view model
- stable command responses for the static Rules page

Stage 28 on-device endpoint mapping:
- `GET  /api/rules/list`
- `GET  /api/rules/{id}`

Still transport-neutral only, not bound on hardware in Stage 28:
- `GET  /ui/rules/catalog`
- `POST /ui/rules/create`
- `POST /ui/rules/{id}/update`
- `POST /ui/rules/{id}/delete`
- `POST /ui/rules/{id}/enable`
- `POST /ui/rules/{id}/disable`

Stable Rules UI result codes:
- `RULES_UI_OK`
- `RULES_UI_RULE_NOT_FOUND`
- `RULES_UI_SAVE_DENIED`
- `RULES_UI_DELETE_DENIED`
- `RULES_UI_ENABLE_DENIED`
- `RULES_UI_DISABLE_DENIED`
- `RULES_UI_INVALID_ARGUMENT`
- `RULES_UI_VALIDATION_FAILED`
- `RULES_UI_DATA_UNAVAILABLE`

The rules UI contract remains transport-neutral in the same way as the dashboard contract:
- no ESP-IDF web server dependency
- no JSON parser/binder requirement in this stage
- host-side testable C++17 adapter/service code

## Flow UI Transport Contract

Stage 15 adds a third transport-neutral UI-facing contract for runtime flowmeter data.

`FlowApiService` owns:
- typed flow list, status, trend and history DTOs
- `CommandContext` validation for batch and reset commands
- stable Flow UI result codes
- thin delegation to `FlowService`

`WebFlowAdapter` owns:
- flow list selection and summary shaping
- chart-friendly trend presentation
- recent history item shaping
- protected lifetime and status badge presentation
- command responses that can carry refreshed list/detail state

Core Flow UI DTOs include:
- `FlowSummaryDto`
- `FlowStatusDto`
- `FlowTrendDto`
- `TrendPointDto`
- `FlowHistoryEntryDto`

Stable Flow UI result codes include:
- `FLOW_UI_OK`
- `FLOW_UI_NO_FLOWMETERS`
- `FLOW_UI_FLOW_NOT_FOUND`
- `FLOW_UI_BATCH_START_DENIED`
- `FLOW_UI_BATCH_STOP_DENIED`
- `FLOW_UI_RESET_DENIED`
- `FLOW_UI_DATA_UNAVAILABLE`
- `FLOW_UI_INVALID_ARGUMENT`
- `FLOW_UI_API_ERROR`

Stage 28 on-device route mapping:
- `GET  /api/flow/list`
- `GET  /api/flow/{id}/status`
- `GET  /api/flow/{id}/trend`
- `GET  /api/flow/{id}/history`
- `POST /api/flow/{id}/batch/start`
- `POST /api/flow/{id}/batch/stop`
- `POST /api/flow/{id}/batch/reset`
- `POST /api/flow/{id}/trip-total/reset`

Behavior notes:
- list ordering is deterministic and matches flow registration order
- trend ordering is preserved oldest-first to match `FlowService`
- history is returned as a deterministic recent bounded slice, still oldest-to-newest within that slice
- protected lifetime totals remain read-only and are never reset through this UI contract

## Status Aggregation

Program status is intentionally broader than raw sequence runtime.

`SequenceApiService` aggregates:
- sequence lifecycle and transition explanation from `SequenceService`
- aggregate and active alarm summary from `AlarmService`
- effective actuator ownership and reason from `ActuatorManager`

This gives the dashboard layer a single service call for:
- current step
- blocked transition reason
- active alarm context
- effective outputs and reasons

## What Remains Postponed

Still postponed beyond the current on-device RC surface:
- broader on-device page binding beyond dashboard, flow and read-only rules
- rule/program/template mutation routes on hardware
- real MQTT network transport
- auth and user/session handling
- generic JSON/config transport expansion

## MQTT note

Stage 24 does not turn MQTT into another HTTP-shaped API.
Instead, `MqttService` reads runtime state directly from:
- `SequenceApiService`
- `FlowApiService`
- `PidService`
- `AlarmService`
- `ActuatorManager`

This keeps MQTT:
- transport-neutral
- scalar-payload-oriented
- independent from future HTTP routing choices
