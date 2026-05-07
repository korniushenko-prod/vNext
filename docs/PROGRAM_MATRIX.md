# Program Output Matrix

Stage 22 adds a read-only Output Matrix for Sequence programs.

## Purpose

The matrix is a mechanics-first visualization of how a program is designed to use outputs across its states.

It answers:
- which states exist
- which actuators are referenced by persistent state actions
- what each state holds continuously on outputs
- which states are special: initial, normal stop, trip, lockout
- which state is currently active when the selected program is running
- where duplicate, conflicting or unsafe output patterns exist

## Semantics

The matrix is a descriptor view, not a runtime effective output view.

That means:
- rows are program states in descriptor order
- columns are actuators referenced by persistent `active_actions`
- cells come only from state `active_actions`
- entry and exit actions never become cells
- runtime arbitration, Safety and Trip ownership resolution remain outside this matrix

Runtime context is still shown separately in a compact banner:
- active program
- lifecycle
- current state
- lockout
- last reason

## Rows And Columns

Each row exposes:
- state id and name
- state type
- special-state badges
- enabled/non-skippable/manual flags
- optional min/max timing
- current active-row highlight when the selected program is live

Each column exposes:
- actuator id
- actuator name when metadata is available
- actuator kind
- actuator role

Column ordering is deterministic:
- first appearance in state order
- then first appearance inside that state
- then stable tie-break by actuator id

## Cell Meanings

Supported cell states in Stage 22:
- blank: no persistent actuator action
- `ON`: relay held on
- `OFF`: relay held off explicitly
- `PWM 45%`: PWM enabled at a persistent duty
- `PWM OFF`: PWM explicitly disabled

Blank is intentionally different from explicit OFF.

## Detail Panel

The detail panel complements the matrix and stays read-only.

For each state it shows:
- entry action summaries
- active action summaries
- exit action summaries
- transition summaries
- guard summary
- timeout summary
- guard-fail summary

This is where non-persistent actions live.

## Warnings

The matrix builder surfaces issues without mutating the program.

Current issue codes:
- `MATRIX_DUPLICATE_ACTUATOR_ACTION`
- `MATRIX_CONFLICTING_ACTUATOR_ACTION`
- `MATRIX_UNKNOWN_ACTUATOR_TARGET`
- `MATRIX_SUSPICIOUS_IDLE_STATE`
- `MATRIX_UNSAFE_TRIP_OUTPUT`
- `MATRIX_UNSAFE_LOCKOUT_OUTPUT`

These warnings help review existing descriptors before runtime problems appear on the machine.

## Transport Layers

Stage 22 adds:
- `ProgramMatrix`
- `ProgramMatrixBuilder`
- `ProgramMatrixApiService`
- `WebProgramMatrixAdapter`
- static `webui/program-matrix/` assets

No real HTTP routing is implemented in this stage. Future bindings can map:
- `GET /ui/program-matrix/list`
- `GET /ui/program-matrix/{id}`
- `GET /ui/program-matrix/active`

## Intentionally Postponed

Stage 22 does not add:
- matrix editing
- state/action editing
- graph view
- template engine
- direct save-flow integration
- HTTP server
- MQTT
