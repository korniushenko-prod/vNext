# Flow UI

## Purpose

Stage 15 adds the first narrow runtime page for flowmeters.

This page is not a full descriptor editor.
It is a mechanics-first dashboard for what `FlowService` already knows at runtime:
- which flowmeters are registered
- current rate
- lifetime, trip and batch totals
- batch active and batch done state
- no-flow and high-flow attention
- last pulse age
- recent history
- bounded trend buckets
- batch runtime controls

## Scope

Stage 15 includes:
- `FlowApiService` as a transport-neutral facade over `FlowService`
- `WebFlowAdapter` for view-oriented shaping and command responses
- one static page in `webui/flow`
- list/detail runtime presentation
- trend and history views
- batch start/stop/reset controls
- read-only descriptor summary

Stage 15 intentionally does not include:
- create, update or delete for `FlowDescriptor`
- K-factor editing
- pulse input reassignment
- density or temperature correction
- reverse flow
- generic config CRUD
- MQTT or Modbus transport
- on-device descriptor editing

## API and adapter shape

`FlowApiService` stays portable C++17 and depends only on `FlowService`.

It owns:
- typed flow list, status, trend and history DTOs
- command validation through `CommandContext`
- stable Flow UI result codes
- thin delegation to batch and total reset operations

`WebFlowAdapter` owns:
- selected-flow list shaping
- deterministic chart-friendly trend view data
- history item view shaping
- protected lifetime and status badge presentation
- command responses that can return refreshed list/detail models

Neither layer reimplements rate, totalizer or batch business logic.

## Runtime-only descriptor summary

The page exposes a read-only descriptor summary with:
- pulse input id
- K-factor
- primary rate mode
- time window
- average-last-N size
- no-flow timeout
- optional high-flow threshold
- trend enabled flag
- trend bucket size and count
- protected lifetime total flag

Editing is postponed because the project does not yet have:
- a shared config-adapter layer
- a safe descriptor source catalog
- validated runtime-to-config editing semantics

## Polling model

The intended embedded page model is simple polling:
- list and selected status refresh every 1 to 2 seconds
- trend and history refresh on selection change and manual refresh
- a manual Refresh button always exists

Websocket and SSE transport remain postponed.

## On-Device Route Mapping

Stage 28 and the Stage 30 RC bind the supported flow routes on hardware:
- `GET  /api/flow/list`
- `GET  /api/flow/{id}/status`
- `GET  /api/flow/{id}/trend`
- `GET  /api/flow/{id}/history`
- `POST /api/flow/{id}/batch/start`
- `POST /api/flow/{id}/batch/stop`
- `POST /api/flow/{id}/batch/reset`
- `POST /api/flow/{id}/trip-total/reset`

The adapter remains transport-neutral even though this narrow hardware binding now exists.

## Status and empty states

The page must keep runtime meaning obvious:
- protected lifetime total is visibly read-only
- batch active and batch done are shown as badges
- no-flow and high-flow are shown as badges
- current rate is the prominent value
- unknown or empty data produces visible empty states instead of silent failure

Human-readable empty states include:
- no flowmeters registered
- no history
- no trend data yet

## Postponed after Stage 15

Still postponed after this stage:
- full descriptor/setup editor
- density correction
- reverse flow
- MQTT UI
- Modbus
- auth and roles
