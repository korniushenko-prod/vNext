# Architecture

## Core principle

The runtime is data-driven.

Templates generate configuration.
Runtime executes configuration.

Application-specific behavior must be expressed as validated configuration and reusable templates, not as hardcoded controller-specific algorithms in runtime modules.

## Hardware baseline

The architecture remains board-agnostic even though the first physical validation target is now the LILYGO T3 V1.6.1 / LoRa32 V2.1.6 board based on ESP32.

Future HAL and hardware backend work must respect the board profile and reserved pin budget documented in `hardware/LILYGO_T3_V1_6_1.md`.
Because this bring-up board already uses many GPIOs for onboard peripherals, external IO expansion or carrier hardware may be required to reach the full relay and input feature set.

## Layers

## Stage 21 editor layering

The custom Program Step Editor follows the same narrow layering used by the existing Rules and Program Builder surfaces:
- `SequenceService` owns safe admin mutations and editor validation helpers
- `ProgramEditorApiService` owns transport-neutral load, preview, save and enable/disable orchestration
- `WebProgramEditorAdapter` shapes form-friendly view models
- `webui/program-editor/*` stays plain HTML, CSS and JS with no framework dependency

## Stage 22 matrix layering

The Output Matrix follows the same transport-neutral split:
- `ProgramMatrixBuilder` owns typed matrix generation from sequence descriptors
- `ProgramMatrixApiService` owns matrix list/detail/active orchestration
- `WebProgramMatrixAdapter` reshapes matrix data into a table-friendly read-only view model
- `webui/program-matrix/*` stays plain HTML, CSS and JS with no framework dependency

### Config Model

The config component owns the typed and versioned configuration model, safe factory defaults and structured validation. Runtime must only execute validated configuration.

### HAL

Owns all hardware access:
- GPIO
- ADC
- pulse capture
- PWM
- Step/Dir
- display buses

No other layer may access hardware directly.

Stage 3 provides portable interface headers plus deterministic mock backends.
Stage 27 adds the first real ESP32 HAL backend for the LILYGO bring-up target while keeping the host/mock path intact.

### Signal Layer

SignalRegistry provides the single runtime truth for process values, commands, statuses and derived signals.
HAL and future runtime modules publish into SignalRegistry and consume from it instead of coupling directly to each other.

### Actuator Layer

ActuatorManager arbitrates output requests by priority, owner and reason, then produces effective actuator state.

### Timer Layer

TimerService provides deterministic timing for runtime modules and tests.
It is driven only by explicit `now_ms`, publishes timer state into SignalRegistry, and is shared by future Rules, Sequence and Alarm-related modules.

### Alarm Layer

AlarmService is the shared runtime alarm layer above SignalRegistry.
In Stage 7 it does not evaluate conditions itself.
Other modules report condition active/inactive state, and AlarmService owns:
- runtime alarm state
- latching and reset semantics
- aggregate severity status
- SignalRegistry publication
- in-memory alarm history

Condition evaluation, trip enforcement and runtime integrations are intentionally postponed.

### Condition Layer

ConditionTree is the shared evaluator for:
- rules
- alarm condition sources
- sequence transitions
- PID guards
- service/test logic

Stage 8 keeps ConditionTree portable and host-side testable.
It reads typed values and flags only through SignalRegistry, uses explicit `now_ms`, and owns per-tree runtime state for delay and hysteresis behavior.

### Logic Engine

Evaluates general purpose IF/THEN and derived logic using:
- `SignalRegistry` for runtime values and signal publication
- `ConditionTree` for typed rule conditions
- `ActuatorManager` for persistent AutoRule output ownership
- `TimerService` for timer command actions
- `AlarmService` for alarm condition actions
- `SequenceService` for program start/stop/trip/reset actions

It is the shared background rule layer for support logic that does not need a full ordered process program.

### Sequence Engine

Executes step-by-step process programs using states, transitions, timers and output requests through ActuatorManager.
In Stage 9 it is a generic one-active-program engine connected to:
- `SignalRegistry` for runtime values and status publication
- `ConditionTree` for guards and transitions
- `TimerService` for explicit timer command actions
- `AlarmService` for explicit alarm condition actions
- `ActuatorManager` for all output ownership and arbitration

### Flowmeter

Owns pulse-based flow measurement, rate calculation, totals and protected lifetime totalizers.
In Stage 14 it connects:
- `PulseInputHal` for pulse counts and optional frequency
- `StorageService` for protected lifetime raw/volume totals
- `SignalRegistry` for runtime publication

The flow layer is measurement-only in this stage and does not own output control.

### PID

Stage 16 introduced a standalone board-agnostic `PidCore` with typed config, snapshots and explicit `now_ms` computation.
Stage 17 adds `PidService` above that core.

Current PID layering is:
- `PidCore` for pure control math
- `PIDService` for requested/effective mode handling, PV/SP source resolution, runtime fault policy, signal publication and actuator ownership
- `SignalRegistry` as the source/publication boundary
- `ActuatorManager` as the only output path

Stage 17 keeps PID output binding intentionally narrow:
- PWM target only
- no direct relay control
- no stepper integration

### Motor Service

Stage 18 adds `MotorService` as a runtime abstraction above raw actuator targets for ordinary PWM-driven DC motors.

Current motor layering is:
- `SignalRegistry` for optional fault/tach inputs and runtime publication
- `MotorService` for requested/effective run, speed, direction and fault-aware runtime state
- `ActuatorManager` as the only output ownership and arbitration path

Stage 18 motor binding is intentionally narrow:
- PWM target required
- optional enable relay target
- optional direction relay target with `forward = OFF`, `reverse = ON`
- no closed-loop speed control, stall detection, current sensing or VFD/Modbus support yet

### Stepper Service

Stage 19 adds `StepperService` as a specialized runtime abstraction for one stepper-based mechanism.

Current stepper layering is:
- `SignalRegistry` for home, limit and fault inputs plus runtime publication
- `StepperService` for homing, move/jog runtime state and open-loop position tracking
- `StepperHal` for low-level enable, direction, rate and stop commands

Stage 19 stepper binding is intentionally narrow:
- single axis per service record
- no `ActuatorManager` ownership/arbitration path yet
- no PID integration
- no Logic or Sequence stepper actions yet
- no advanced motion planner, jerk control or multi-axis coordination

### Storage

Owns typed configuration persistence, backup copies, integrity checks, factory reset behavior, protected counters and storage event recording.

Stage 2 uses only a backend abstraction plus in-memory/mock backend.
Public config serialization and real ESP32 persistence backends are postponed.

### API

Exposes validated access to configuration, runtime state and control operations.

Stage 10 adds a transport-neutral `SequenceApiService` above runtime services:
- `SequenceService`
- `AlarmService`
- `ActuatorManager`

Stage 15 extends this layer with a transport-neutral `FlowApiService` above `FlowService` plus `WebFlowAdapter` for flow-runtime-specific view shaping.
Stage 20 extends the same layer again with `ProgramBuilderApiService` plus `WebProgramBuilderAdapter` for safe wizard-driven sequence scaffold creation.

The intended layering is:
- runtime services produce typed snapshots and command results
- `SequenceApiService` aggregates and shapes a stable UI-facing contract
- `ProgramBuilderApiService` aggregates runtime catalogs and safe scaffold creation
- `WebDashboardAdapter` reshapes Sequence API DTOs into a narrow dashboard view model
- `WebProgramBuilderAdapter` reshapes builder DTOs into a narrow wizard view model
- future HTTP transport and embedded Web UI consume `WebDashboardAdapter` instead of reaching into runtime internals

### MQTT

Stage 24 adds `MqttService` as a transport-neutral bridge above runtime services and beside future network transport backends.

Current MQTT layering is:
- `SequenceApiService`, `FlowApiService`, `PidService`, `AlarmService` and `ActuatorManager` as the runtime data and command sources
- `MqttTopicMapper` for deterministic topic naming
- `MqttService` for scalar publication, safe command parsing and structured history/results
- `MqttClientBackend` as the transport abstraction
- `MockMqttClientBackend` for host-side tests

The current path is:
- runtime services
- `MqttService`
- future real MQTT transport backend

Stage 24 intentionally postpones the real ESP32 MQTT client/backend.

### Local Display

Stage 25 adds `DisplayService` as the local OLED-oriented status layer above existing runtime services.

Current display layering is:
- runtime services (`SequenceApiService`, `FlowApiService`, `PidService`, `AlarmService`, `MqttService`)
- `DisplayService`
- `DisplayHAL`

The Stage 25 display path is:
- runtime snapshots and summaries
- compact text screen builders
- `DisplayService`
- line-based `DisplayHAL`
- future real SSD1306 backend

Stage 25 intentionally postpones pixel graphics, button input and display editing UI.
Stage 27 adds the first real SSD1306-oriented ESP32 backend under the same `DisplayHAL` contract.

### Stage 27 hardware bring-up layer

Stage 27 adds a narrow target path beside the existing mock path:

- `board_profile_lilygo_t3_v1_6_1.hpp` for reserved pins and optional external test-pin binding
- `esp32_*_hal.cpp` backends for relay, DI, AI, PWM, pulse and display
- `src/main.cpp` as a safe boot/status-only firmware entrypoint
- a local bring-up Wi-Fi status path that stays outside the runtime HTTP/MQTT architecture
- a flash sanity gate that reports board expectation versus image/detected flash before hardware validation

The hardware path is still intentionally narrow:

- no LoRa init
- no SD init
- no target HTTP/MQTT stack
- no stepper real backend
- no field IO validation logic

Stage 27b keeps the network path strictly bring-up-scoped:

- typed local STA/AP defaults only
- no runtime config editor
- no web transport
- OLED default rendering limited to one IP line with `STA IP > AP IP > ---`

### Stage 28 embedded web layer

Stage 28 adds the first real on-device HTTP binding while keeping the architecture narrow:

- `WebRouteService` owns the ESP-IDF HTTP server lifecycle and route registration
- `WebAssetRegistry` serves embedded static assets for dashboard, flow and rules
- `WebDashboardAdapter`, `WebFlowAdapter` and `WebRulesAdapter` remain the transport-neutral shaping layer
- runtime ownership stays with `SequenceApiService`, `FlowApiService` and `RulesApiService`

The Stage 28 hardware HTTP path is therefore:

- runtime services
- transport-neutral API/adapters
- `WebRouteService`
- embedded static pages in `webui/dashboard`, `webui/flow`, `webui/rules`

Stage 28 deliberately excludes:

- rule mutation binding on hardware
- program/template editing on hardware
- raw GPIO/relay command surfaces
- auth/TLS/HTTPS
- websocket/SSE push

### Simulator And Integration Harness

Stage 26 adds a host-side simulator layer outside the embedded runtime path.

Current simulator layering is:
- existing runtime services and template generation
- `SimHarness` for deterministic mock-HAL wiring
- `SimScenarioRunner` plus `SimClock` for fixed-step execution
- simple plant/discrete models for pressure, flow and supervisory temperature behavior
- host-side integration tests in `tests/sim`

The simulator is intentionally:
- host-side only
- explicit-time driven
- deterministic
- limited to engineering approximations for integration testing

It is not part of the production firmware runtime and does not replace later hardware bring-up or HIL work.

### Web UI

Static embedded UI served by firmware. Primary UX is mechanics-first.

Stage 11 starts this layer with a narrow dashboard adapter path:
- `SequenceApiService -> WebDashboardAdapter -> Program Dashboard page`
- polling is used instead of websocket/server push

Stage 13 adds a transport-neutral Rules UI adapter path:
- `LogicService -> RulesApiService -> WebRulesAdapter -> Rules page shell`
- full mutation contracts exist host-side, while hardware stays read-only

Stage 15 adds a second narrow runtime page:
- `FlowApiService -> WebFlowAdapter -> Flow runtime page`
- trend and history stay narrow, polling-based and mechanics-first
- descriptor editing is intentionally postponed

Stage 28 turns the supported subset of that adapter stack into a real on-device web surface:

- `/` serves the dashboard
- `/flow` serves the flow page
- `/rules` serves the rules page
- rules stay read-only on hardware in this stage

Stage 20 adds a third narrow creation page:
- `ProgramSkeletonBuilder -> ProgramBuilderApiService -> WebProgramBuilderAdapter -> future HTTP binding -> Program Builder Wizard`
- preview-before-create and disabled-by-default creation are the core UX contract
- full template editing, custom step editing and output matrix editing remain postponed

Stage 23 adds a fourth narrow creation surface:
- runtime catalogs from `SignalRegistry`, `ActuatorManager`, `TimerService`, `AlarmService`, `SequenceService` and `PIDService`
- `TemplateEngine` for typed draft validation, bundle generation and safe apply with rollback
- `TemplateApiService` for transport-neutral template catalog, schema, preview and apply orchestration
- `WebTemplateAdapter` for wizard-friendly mechanics-first view models
- `webui/templates/*` as a plain HTML, CSS and JS shell

The Stage 23 path is:
- runtime catalogs + existing runtime services
- `TemplateEngine`
- `TemplateApiService`
- `WebTemplateAdapter`
- future HTTP binding
- Templates page

### Templates

Templates describe reusable application-level patterns that generate validated configuration for the generic runtime.
Stage 23 narrows this to curated bundle generation across Sequence, Logic, Alarm and PID services rather than generic config editing.
