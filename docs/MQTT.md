# MQTT

## Purpose

Stage 24 adds a transport-neutral MQTT bridge/service for runtime status publication and a narrow set of safe inbound commands.

This stage is intentionally:
- broker-agnostic
- network-client-agnostic
- portable C++17
- host-side testable through a mock backend

This stage intentionally does not add:
- a real ESP-IDF MQTT client
- a real broker/network stack
- Home Assistant discovery
- JSON-heavy payload contracts
- TLS/auth provisioning
- Web UI
- generic remote config editing

## Current architecture

Current path:
- runtime services produce typed status and command surfaces
- `MqttService` maps those to deterministic MQTT topics
- `MqttClientBackend` abstracts transport/backend behavior
- `MockMqttClientBackend` drives host-side tests

Runtime integration in this stage:
- `SequenceApiService` for sequence status and safe sequence commands
- `FlowApiService` for flow status and safe flow commands
- `PidService` for PID status and safe PID commands
- `AlarmService` for aggregate alarm status
- `ActuatorManager` for effective actuator status

## Topic naming

All topics are rooted at:

`<prefix>/`

Default availability topic:

`<prefix>/availability`

Example status families:
- `<prefix>/sequence/active_program_id`
- `<prefix>/sequence/lifecycle`
- `<prefix>/alarm/any_active`
- `<prefix>/actuator/<id>/owner`
- `<prefix>/flow/<id>/batch_active`
- `<prefix>/pid/<id>/effective_mode`

Example command families:
- `<prefix>/cmd/program/start`
- `<prefix>/cmd/flow/<id>/batch/start`
- `<prefix>/cmd/pid/<id>/mode`

Command result topics:
- `<prefix>/cmd/result/code`
- `<prefix>/cmd/result/message`
- `<prefix>/cmd/result/topic`
- `<prefix>/cmd/result/success`

## Payload policy

Stage 24 uses plain UTF-8 scalar payloads only.

Rules:
- bools publish as `true` or `false`
- numbers publish as decimal strings
- enums and modes publish as lowercase strings
- optional string-like values publish as an empty string when absent
- no binary payloads
- no JSON object payloads

Examples:
- `online`
- `offline`
- `start`
- `stop`
- `manual`
- `auto`
- `12.5`

Status is published as many narrow topics instead of one large JSON document.

## Supported command topics

Sequence:
- `<prefix>/cmd/program/start` with payload `program_id`
- `<prefix>/cmd/program/stop`
- `<prefix>/cmd/program/trip`
- `<prefix>/cmd/program/reset`

Flow:
- `<prefix>/cmd/flow/<id>/batch/start` with optional numeric payload override
- `<prefix>/cmd/flow/<id>/batch/stop`
- `<prefix>/cmd/flow/<id>/batch/reset`
- `<prefix>/cmd/flow/<id>/trip/reset`

PID:
- `<prefix>/cmd/pid/<id>/mode` with payload `manual|auto|hold|disabled`
- `<prefix>/cmd/pid/<id>/setpoint` with numeric payload
- `<prefix>/cmd/pid/<id>/manual_output` with numeric payload
- `<prefix>/cmd/pid/<id>/integral/reset`

Not supported in this stage:
- raw relay on/off commands
- raw GPIO commands
- stepper commands
- program/rule/template editing through MQTT

## Subscription policy

Stage 24 uses explicit deterministic subscriptions.

Current behavior:
- sequence command topics are subscribed directly
- flow command topics are subscribed per registered flow id
- PID command topics are subscribed per registered PID id
- no wildcard dependency is required in the backend contract

## Publish policy

The bridge is driven only by explicit `now_ms`.
There is no hidden wall clock.

Rules:
- availability publishes `online` on connect
- availability publishes `offline` on bridge-managed disconnect/disable
- status snapshot publishes every `status_publish_interval_ms` while connected
- successful commands mark the bridge dirty and trigger an immediate status refresh
- status retain behavior follows `retain_status`

If the backend is already disconnected unexpectedly, the bridge records that state in history/snapshot and does not attempt fake offline publishing through a dead transport.

## History model

The bridge keeps a bounded in-memory event log with drop-oldest behavior.

Each entry includes:
- `sequence_number`
- `timestamp_ms`
- `event_type`
- `topic`
- optional `payload`
- `success`
- `reason`

Supported event types:
- `connected`
- `disconnected`
- `published`
- `publish_failed`
- `subscribed`
- `command_received`
- `command_executed`
- `command_rejected`
- `command_parse_error`

## Result and error model

The bridge uses structured result codes instead of plain booleans.

Current codes include:
- `MQTT_OK`
- `MQTT_ALREADY_REGISTERED`
- `MQTT_INVALID_DESCRIPTOR`
- `MQTT_BACKEND_NOT_BOUND`
- `MQTT_NOT_CONNECTED`
- `MQTT_PUBLISH_FAILED`
- `MQTT_SUBSCRIBE_FAILED`
- `MQTT_UNKNOWN_COMMAND_TOPIC`
- `MQTT_COMMAND_PARSE_ERROR`
- `MQTT_COMMAND_EXECUTION_FAILED`
- `MQTT_INVALID_ARGUMENT`

## Deferred work

Still postponed beyond Stage 24:
- real ESP32 MQTT backend
- broker session management
- Home Assistant discovery
- retained discovery/config entities
- auth and TLS provisioning
- remote program/rule/template editing
- generic config CRUD over MQTT

## Stage 29 smoke path

Stage 29 allows a documented low-risk smoke path only:

- use an already-available broker outside CI
- verify availability and a small status publish set
- optionally exercise one narrow safe command topic

Stage 29 still does not require:

- broker setup in CI
- new MQTT architecture
- production auth/TLS work
