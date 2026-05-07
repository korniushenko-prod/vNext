# ESP32 Relay / Flow / PID / Sequence Controller

Local board-agnostic automation controller for:
- 4 relay outputs
- configurable DI/AI/Pulse inputs
- flowmeter and totalizers
- PID control
- PWM/DC motor control
- Step/Dir stepper control
- alarms and trips
- rule engine
- sequence engine for step-by-step process programs
- Web UI
- HTTP API
- MQTT

## Project status

Stage 30: Release Candidate / Final Stabilization for LILYGO T3 V1.6.1.

RC marker: `stage30-rc1`

Stage 30 freezes the current surface and focuses on release readiness:
- no new major runtime architecture
- no new UI pages or protocols
- targeted RC bug fixes only
- coherent CI/build matrix
- explicit known limits and acceptance criteria

Supported RC surface:
- on-device dashboard at `/`
- on-device flow page at `/flow`
- on-device rules page at `/rules` with read-only hardware binding
- sequence, logic, flow, PID, motor and stepper runtimes
- template engine
- MQTT bridge with transport-neutral service plus mock-backed tests
- OLED local status display with real bring-up backend
- safe low-voltage bench path on `lilygo_t3_v161_bench_web`

RC acceptance package:
- [docs/RC_CHECKLIST.md](docs/RC_CHECKLIST.md)
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)
- [docs/RELEASE_NOTES_RC.md](docs/RELEASE_NOTES_RC.md)
- [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md)

Stage 21 adds a custom Program Step Editor for existing sequence programs with:
- typed draft, preview and catalog models
- safe inactive-only save and delete behavior
- transport-neutral editor API and Web adapter
- static mechanics-first editor shell in `webui/program-editor`

Stage 22 adds a read-only Output Matrix UI for existing Sequence programs with:
- typed `ProgramMatrix` and `ProgramMatrixBuilder`
- transport-neutral matrix API and Web adapter
- current active-state highlight
- warnings for duplicate, conflicting and unsafe persistent output patterns
- a static mechanics-first shell in `webui/program-matrix`

Stage 23 adds a Template Engine with:
- typed template kinds, drafts, catalogs and previews
- deterministic bundle generation across Sequence, Logic, Alarm and PID services
- disabled-by-default creation for generated programs, rules and PID controllers
- apply guards while any program is active
- rollback on partial runtime registration failure
- a transport-neutral Template API and Web adapter
- a static mechanics-first shell in `webui/templates`

Stage 24 adds an MQTT bridge with:
- typed descriptor, topic mapper and structured result/history models
- transport-neutral backend interface plus host-side mock backend
- scalar topic-per-field runtime publication for sequence, alarm, actuator, flow and PID state
- narrow safe command topics for program control, flow batch control and PID mode/setpoint/manual output
- no real broker/network client yet in this stage

Stage 25 adds a local display layer with:
- typed `DisplayDescriptor`, `DisplayFrame`, `DisplaySnapshot` and history models
- compact text-oriented `main`, `program`, `flow`, `pid`, `alarms` and `mqtt` screens
- deterministic rotation plus trip/safety alarm override
- line-based `DisplayHAL` rendering for the built-in LILYGO OLED target
- a transport-neutral display service that later gains the real SSD1306 / I2C bring-up backend in Stage 27

Stage 26 adds a simulator layer with:
- explicit-time `SimClock` and deterministic `SimScenarioRunner`
- `SimHarness` wiring runtime services to mock HAL and storage
- simple host-side pressure, pulse-flow and incinerator temperature models
- template-driven integration scenarios for pressure, PID, flow, burner and incinerator coverage
- no real hardware backend, broker or wall-clock timing in this stage

Stage 27 adds hardware bring-up with:
- `platformio.ini` target env `lilygo_t3_v161_bringup`
- board profile and reserved-pin enforcement for LILYGO T3 V1.6.1
- real ESP32 HAL backends for relay, DI, AI, PWM, pulse and OLED display
- a safe bring-up firmware entrypoint in `src/main.cpp`
- OLED local status plus onboard LED heartbeat
- minimal STA/AP bring-up status with default STA preset `Infinity-Starlink`
- OLED network policy `STA IP > AP IP > ---` with IP-only default rendering
- an explicit flash sanity gate that surfaces board/image/detected flash mismatch as a bring-up warning
- compile-only CI for the target firmware

Stage 28 adds the first narrow on-device web/bench layer with:
- PlatformIO env `lilygo_t3_v161_bench_web`
- a minimal ESP32 HTTP server binding in `firmware/components/web`
- static asset serving for `webui/dashboard`, `webui/flow` and `webui/rules`
- on-device routes `/`, `/flow` and `/rules`
- safe API binding for dashboard commands, flow batch control and read-only rules inspection
- optional bench mode signage with safe-by-default unbound external test pins
- Stage 28 bench/web partition sizing through `partitions_stage28_bench_web.csv`
- low-voltage-only bench and safe-wiring documentation

Stage 29 keeps the same target/profile and focuses on hardening:
- beta docs in `docs/BETA.md`
- a bench validation matrix in `docs/BENCH_TESTS.md`
- clearer browser empty/live flow diagnostics
- explicit pulse-fixture binding guidance for live flow and batch validation
- low-voltage-only PWM/pulse/DI/AI fixture guidance
- no new major runtime architecture

Core runtime logic now exists for the Sequence Engine MVP, the background Logic Engine, the first dedicated flow/runtime measurement module, the standalone PID math/runtime layers, the DC motor runtime abstraction above raw actuator targets, the first dedicated stepper mechanism runtime, the first safe wizard-driven sequence scaffold generator, the first safe custom program editor, the first read-only output matrix review surface, the first curated multi-service Template Engine, the first transport-neutral MQTT bridge, the first transport-neutral local display layer and the first host-side integration simulator.
Stage 10 added the typed `SequenceApiService`, Stage 11 added the first narrow mechanics-facing dashboard page, Stage 12 added reusable background rule execution, Stage 13 added the first narrow mechanics-facing Rules editor, Stage 14 added `FlowService`, Stage 15 added the first narrow Flow runtime page, Stage 16 added the standalone `PidCore`, Stage 17 added `PidService`, Stage 18 added `MotorService`, Stage 19 added `StepperService`, Stage 20 added the Program Builder Wizard, Stage 21 added the Program Step Editor, Stage 22 added the Output Matrix UI, Stage 23 added the Template Engine, Stage 24 added the MQTT bridge, Stage 25 added the local display service, and Stage 26 adds the simulator and integration harness.

## Current hardware baseline

- Primary bring-up board: LILYGO T3 V1.6.1 / LoRa32 V2.1.6
- PlatformIO bring-up profile: `platform = espressif32`, `board = esp32dev`
- Stage 27b keeps the generic `esp32dev` profile for narrow bring-up, so flash-size sanity must be checked explicitly against the real module before first hardware validation is considered closed.
- Stage 28 keeps the same board/profile baseline but adds a dedicated `lilygo_t3_v161_bench_web` target with a `1500K` app slot for the embedded web payload.
- Stage 29 keeps the same env and partitioning, but treats it as a beta bench validation target rather than a one-off bring-up image.
- Stage 30 keeps both target envs unchanged and treats them as the RC compile/validation baseline.
- The board already consumes many GPIOs through onboard OLED, SD, LoRa, battery ADC and LED functions.
- Project logic, runtime services and architecture remain portable across boards.

## Main concept

This project is data-driven.

Templates generate configuration.
Runtime executes configuration.

The firmware should not contain hardcoded application-only algorithms for pumps, burners or incinerators.

## Core modules

- HAL for all hardware access
- SignalRegistry as unified runtime signal layer
- ActuatorManager for arbitration and safe output ownership
- TimerService for timing and deterministic tests
- Alarm and trip services
- ConditionTree for shared condition evaluation
- Sequence Engine for step-by-step programs
- Rule and logic layers
- Flowmeter, totalizer and PID core/service layers
- Storage, API and embedded Web UI

## Storage status

Storage now includes:
- typed active and backup config slots
- deterministic internal config snapshot with CRC32
- in-memory/mock backend only
- protected lifetime totalizers
- event log skeleton

See [docs/STORAGE.md](docs/STORAGE.md).

## HAL status

HAL now includes:
- typed hardware abstraction interfaces
- in-memory/mock implementations for host-side tests
- real ESP32 bring-up backends for relay, DI, AI, PWM, pulse and display
- explicit relay and PWM safe-state behavior
- DI debounce, AI scaling/clamp and pulse count contracts
- stepper enable/direction/rate MVP interfaces for runtime motion services
- a line-based SSD1306-oriented OLED backend for Stage 27 bring-up

See [docs/HAL.md](docs/HAL.md).

## SignalRegistry status

SignalRegistry now includes:
- typed signal descriptors and runtime values
- structured registration, update and read APIs
- `valid`, `fault` and deterministic `stale` flags
- writable virtual signals
- host-side tests for basic, error and stale behavior

See [docs/SIGNALS.md](docs/SIGNALS.md).

## TimerService status

TimerService now includes:
- typed timer descriptors, runtime state and snapshots
- explicit `now_ms` semantics with no hidden wall clock
- `TON`, `TOF`, `TP`, `MIN_ON`, `MIN_OFF`, `WATCHDOG`, `STARTUP_BYPASS`, `COOLDOWN`, `STATE_MIN_TIME`, `STATE_MAX_TIME`
- structured runtime operations and structured errors
- SignalRegistry publication for timer status
- host-side tests for semantics, watchdogs, windows and signal publishing

See [docs/TIMERS.md](docs/TIMERS.md).

## AlarmService status

AlarmService now includes:
- typed alarm descriptors, runtime state and snapshots
- explicit severity ordering from `info` through `safety`
- latching and non-latching alarm semantics
- manual reset rules for latched alarms
- aggregate alarm status and highest-severity tracking
- SignalRegistry publication for aggregate and per-alarm state
- bounded in-memory history with deterministic ordering

See [docs/ALARMS.md](docs/ALARMS.md).

## ConditionTree status

ConditionTree now includes:
- typed tree descriptors and node-local options
- `ALL`, `ANY`, `NOT`, compare, range and flag nodes
- deterministic evaluation from `SignalRegistry` plus explicit `now_ms`
- leaf `delay_on_ms` and `delay_off_ms`
- compare-node numeric hysteresis
- flattened evaluation trace/checklist with reasons

See [docs/CONDITIONS.md](docs/CONDITIONS.md).

## Sequence Engine status

Sequence Engine now includes:
- typed program, state, transition, action and snapshot models
- one-active-program MVP runtime
- program validation before registration
- entry, active and exit action semantics
- guard, min-time, max-time and ordered transition evaluation
- normal stop, trip, lockout and reset behavior
- ActuatorManager, TimerService, AlarmService and SignalRegistry integration
- bounded in-memory history

See [docs/SEQUENCE.md](docs/SEQUENCE.md).

## Logic Engine status

Logic Engine now includes:
- typed rule, action, snapshot and history models
- rule validation before registration
- `on_true`, `while_true` and `on_false` semantics
- `ConditionTree`, `ActuatorManager`, `TimerService`, `AlarmService`, `SequenceService` and `SignalRegistry` integration
- bounded in-memory rule history

See [docs/LOGIC.md](docs/LOGIC.md).

## FlowService status

Stage 14 now includes:
- typed `FlowDescriptor`, runtime state, snapshots, history and trend buckets
- `PulseInputHal`, `StorageService` and `SignalRegistry` integration
- protected lifetime raw-pulse and volume totals
- time-window, pulse-frequency and avg-last-n-pulses rate modes
- batch runtime, no-flow/high-flow status and bounded in-memory history/trend buffers

See [docs/FLOW.md](docs/FLOW.md).

## Flow UI status

Stage 15 now includes:
- `FlowApiService` as a transport-neutral facade over `FlowService`
- `WebFlowAdapter` for list/detail/trend/history/batch view shaping
- one static Flow page in `webui/flow`
- runtime batch start/stop/reset controls
- protected lifetime total as visible read-only state

See [docs/FLOW_UI.md](docs/FLOW_UI.md).

## PID Core status

Stage 16 now includes:
- standalone `PidCore` with no ESP-IDF, HAL, SignalRegistry or ActuatorManager dependency
- typed `PidConfig`, `PidSnapshot`, validation and structured result/status codes
- explicit `compute(process_value, now_ms)` timing with sample-time discipline
- direct/reverse action, output limits, integral limits, anti-windup and deadband
- manual, auto and hold modes plus bumpless manual-to-auto transfer

See [docs/PID.md](docs/PID.md).

## MotorService status

Stage 18 now includes:
- typed `MotorDescriptor`, `MotorCommand`, `MotorSnapshot`, result codes and bounded history
- `MotorService` above `SignalRegistry` and `ActuatorManager`
- soft start, soft stop, optional start boost and reverse delay
- optional fault/tach reads plus runtime counters and signal publication
- host-side tests for basic, ramp, direction, fault, signal, history and error behavior

See [docs/MOTOR.md](docs/MOTOR.md).

## StepperService status

Stage 19 now includes:
- typed `StepperDescriptor`, `StepperSnapshot`, result codes and bounded history
- `StepperService` above `SignalRegistry` and `StepperHal`
- homing, move-to-steps, move-to-percent and manual jog
- limit and fault signal handling plus runtime signal publication
- host-side tests for basic, homing, move, jog, limit, fault, signal, history and error behavior

See [docs/STEPPER.md](docs/STEPPER.md).

## Sequence API status

Sequence API now includes:
- typed request and response DTOs
- `SequenceApiService` as a transport-neutral facade
- program list, status, history and command surfaces
- aggregated alarm and actuator summaries for dashboard-facing status
- future HTTP endpoint mapping documentation without adding real transport code yet

See [docs/API.md](docs/API.md).

## MQTT Bridge status

Stage 24 now includes:
- typed MQTT descriptor, topic mapper, backend and snapshot/history models
- `MqttService` as a transport-neutral bridge over existing runtime services
- `MockMqttClientBackend` for deterministic host-side tests
- availability, periodic scalar status publishing and safe inbound command handling
- no ESP-IDF broker client or Home Assistant discovery yet

See [docs/MQTT.md](docs/MQTT.md).

## Local Display status

Stage 25 now includes:
- `DisplayService` as a transport-neutral local OLED status layer
- compact text-oriented screens for main/program/flow/pid/alarms/mqtt
- deterministic rotation and trip/safety alarm override
- bounded in-memory display history and `SignalRegistry` publication
- `DisplayHAL` integration, with the real SSD1306-oriented bring-up backend now used on the LILYGO target

See [docs/DISPLAY.md](docs/DISPLAY.md).

## Program Dashboard status

Stage 11 now includes:
- `WebDashboardAdapter` for dashboard-oriented data and command responses
- one static dashboard page in `webui/dashboard`
- polling plus manual refresh
- visible transition blockers, actuator reasons, alarms and recent history

Stage 28 now binds that dashboard on-device at:
- `GET /`
- `GET /api/dashboard/data`
- `POST /api/dashboard/start`
- `POST /api/dashboard/stop`
- `POST /api/dashboard/trip`
- `POST /api/dashboard/reset`

See [docs/WEB_DASHBOARD.md](docs/WEB_DASHBOARD.md).

## Rules UI status

Stage 13 now includes:
- `RulesApiService` as a transport-neutral facade over `LogicService`
- `WebRulesAdapter` for list/detail/editor/trace view models
- one static Rules page in `webui/rules`
- transport-neutral mutation support for host-side/editor workflows
- Stage 28 on-device binding limited to read-only list/detail/trace views

See [docs/RULES_UI.md](docs/RULES_UI.md).

## Local-first operation

The controller is intended to run locally on the device.

Primary operation must remain possible without cloud dependencies. Remote integrations such as MQTT are secondary and must not replace local control and local diagnostics.

## Safety

This is not a certified safety PLC or certified burner management system.

External hardware safety devices are required for real machinery.

Safety and Trip states must always override Manual, PID, Sequence and Rules.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md).
