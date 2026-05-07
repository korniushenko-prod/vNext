# Web Dashboard

## Purpose

Stage 11 adds the first real embedded web page on the device:
- a narrow Program Dashboard
- mechanics-first status visibility
- simple control buttons for the active process program

This page is intentionally focused on one question set:
- what program is active
- what state is active
- what will happen next
- what is blocking progress
- which outputs are active and why
- which alarms are active
- whether start, stop, trip and reset are allowed

## Scope In This Stage

Stage 11 includes:
- `WebDashboardAdapter` as a transport-neutral adapter over `SequenceApiService`
- one static dashboard page in `webui/dashboard`
- simple polling plus a manual Refresh button
- Start, Normal Stop, Trip and Reset command paths
- recent bounded history panel
- host-side adapter and view-model tests

Stage 11 intentionally does not include:
- a generic HTTP framework
- a full SPA application
- routing or multi-page navigation
- rules editor
- program wizard
- custom program editor
- flow UI
- PID UI
- matrix UI
- MQTT UI
- auth or role handling
- websocket or SSE push

## Data Shown

The dashboard consumes `SequenceApiService` through `WebDashboardAdapter` and shapes a view model with:
- active program id and name
- lifecycle
- current state id and type
- state elapsed time
- pending normal stop and pending trip flags
- lockout status
- command enable/disable flags with explanation text
- ordered transition candidates
- prominent blocked-transition list when nothing is eligible
- active alarm summary and entries
- actuator summaries with owner, reason and safe fallback visibility
- bounded recent history entries
- registered program list for simple start selection

## Command Support

Supported on-device contract:
- `GET /api/dashboard/data`
- `POST /api/dashboard/start`
- `POST /api/dashboard/stop`
- `POST /api/dashboard/trip`
- `POST /api/dashboard/reset`

The adapter remains transport-neutral even though the narrow ESP32 HTTP binding now exists.

## Polling Model

The dashboard uses a deliberately simple refresh model:
- periodic polling every 1.5 seconds
- manual Refresh button
- immediate refresh after command completion

Websocket and server-push behavior are postponed until later stages because:
- the dashboard contract is still settling
- the first need is readable status, not live streaming complexity
- host-side testability matters more than transport sophistication at this point

## Mechanics-First UX

The page is optimized for field readability:
- large program and state text
- explicit blocked reasons in the main layout, not only in tooltips
- distinct Trip styling
- clear "No active alarms" state
- clear safe-fallback badges on outputs
- human-readable reason text where available

Examples of the intended UX:
- `Blocked: air_flow_ok is false`
- `Safe fallback`
- `No active program. Select a registered program to start.`

## Architecture Boundary

The supported flow is:

`SequenceApiService -> WebDashboardAdapter -> on-device HTTP binding -> webui/dashboard`

Business logic remains in runtime services.
The dashboard adapter only:
- calls `SequenceApiService`
- maps DTOs into dashboard-focused view data
- maps stable dashboard result codes
- keeps non-transport UI logic host-side testable
