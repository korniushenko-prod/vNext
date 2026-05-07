# Decisions

## Initial architecture decisions

- Runtime architecture: board-agnostic
- Primary hardware bring-up target: LILYGO T3 V1.6.1 / LoRa32 V2.1.6
- Initial PlatformIO bring-up profile: `platform = espressif32`, `board = esp32dev`
- Primary bring-up silicon target: ESP32
- Firmware framework: ESP-IDF
- Core runtime style: portable C/C++ modules where possible
- Hardware access: only through HAL
- Web UI: static embedded Web UI served by firmware
- Config format: JSON-like structured config
- Runtime logic: data-driven configuration, not hardcoded application algorithms
- Testing: host-side unit tests with mock HAL and fake clock
- Built-in OLED is part of the local status surface and remains reserved by default.
- LoRa and SD are not required for MVP runtime.
- A pin-audit step is mandatory before real hardware bring-up.

## Product decisions

## Stage 21 Program Editor

- The custom program editor is form-based and not graph-based.
- `program_id` is immutable after a program is created.
- Active programs are readable but not editable in the Stage 21 editor MVP.
- Save and delete stay inactive-only in Stage 21.
- Output matrix editing remains postponed beyond Stage 21.

## Stage 22 Output Matrix UI

- The first Output Matrix MVP is read-only.
- The matrix is a descriptor/program view, not a runtime arbitration result view.
- Matrix cells are defined only by persistent state `active_actions`.
- Entry and exit actions stay in the state detail panel, not in matrix cells.
- Current runtime context may highlight the active state row, but it does not rewrite matrix semantics.

- Templates generate config.
- Runtime executes config.
- No hardcoded application algorithms in runtime.
- UI is mechanics-first.
- Expert mode is allowed but must be validated before apply.
- Host-side tests use mock HAL and fake clock.
- Config model is typed and versioned.
- Validation is host-side testable.
- Runtime will execute validated config only.
- JSON parser and import are postponed.
- Storage is typed and backend-abstracted.
- Storage starts with an in-memory/mock backend before any ESP32 persistence backend.
- Public config serialization/import-export is postponed even though storage has an internal deterministic snapshot format.
- Protected lifetime totalizers survive both normal reset and factory reset.
- `load_best_available_config()` fallback order is active, then backup, then factory default.
- HAL starts with mock/in-memory backends before any ESP32-specific backend is introduced.
- HAL safe behavior is explicit at the interface boundary, starting with relay safe states and PWM safe duty contracts.
- HAL tests are deterministic and host-side first, including debounce and scaling behavior.
- Real ESP32 HAL implementations are postponed until after the interface contracts settle.
- SignalRegistry is the common runtime data layer for process values, commands, statuses and derived signals.
- Future runtime modules must communicate through SignalRegistry instead of direct module-to-module coupling.
- Signal stale state is computed from descriptor `max_age_ms` and caller-supplied `now_ms`, not from a hidden wall clock.
- SignalRegistry must remain host-side testable and must not rely on hidden singleton or global state.
- TimerService is deterministic and fake-time driven through explicit caller-supplied `now_ms`.
- TimerService must not read a wall clock internally or rely on blocking waits.
- TimerService publishes timer status into SignalRegistry using stable per-timer signal paths.
- Timer semantics are explicit, documented and covered by host-side tests before any Rules, Sequence or Alarm runtime is introduced.
- Alarms are centralized in AlarmService instead of being managed as ad-hoc booleans inside future modules.
- Alarm condition evaluation is postponed; Stage 7 accepts externally reported condition active/inactive state only.
- Severity aggregation is part of AlarmService and uses explicit ordering: `safety > trip > inhibit > warning > info`.
- Latching and manual reset semantics are explicit, documented and host-side tested before Rules or Sequence integration.
- AlarmService publishes both aggregate `alarm.*` signals and per-alarm `alarm.<id>.*` signals through SignalRegistry.
- ConditionTree is the shared condition language for future Rules, Sequence, alarm condition sources, PID guards and service/test logic.
- ConditionTree evaluation depends only on SignalRegistry, explicit caller-supplied `now_ms` and evaluator-owned runtime state.
- ConditionTree must not read a hidden wall clock or use singleton state.
- Every ConditionTree evaluator instance owns runtime state for exactly one tree instance.
- Range-node hysteresis is postponed beyond Stage 8.
- Group-node delay is postponed beyond Stage 8.
- Sequence Engine is config/data-driven and uses sequence-native typed descriptors instead of hardcoded process logic.
- Sequence Engine MVP runs exactly one active program at a time; multi-program runtime is postponed.
- Sequence Engine uses `ConditionTree` for start conditions, reset conditions, guards and transitions.
- Sequence Engine owns actuator requests through stable owner/reason strings and always uses `Sequence` priority.
- Sequence API starts as a transport-neutral typed facade before any real HTTP server is added.
- Future dashboard and HTTP transport must consume `SequenceApiService` instead of reading `SequenceService` directly.
- Sequence API remains host-side testable and portable C++17 with no ESP-IDF dependency.
- Program status responses include actuator and alarm summaries, not only raw sequence lifecycle.
- Real HTTP routing, JSON serialization and Web UI transport binding remain postponed beyond Stage 10.
- The first real embedded web page is dashboard-only rather than a full generic web stack.
- Stage 11 adds a transport-neutral `WebDashboardAdapter` between `SequenceApiService` and the eventual narrow on-device HTTP binding.
- The first dashboard uses plain static HTML, CSS and JavaScript with no heavy frontend framework.
- Mechanics-first readability wins over generic developer-facing JSON output.
- Websocket/live push is postponed; simple polling is sufficient for the first dashboard stage.
- Background rules use `ConditionTree` as their only condition language.
- Logic Engine sends persistent output requests through `ActuatorManager` only and always uses `AutoRule` priority.
- Logic Engine evaluates rules in deterministic registration order.
- Rules UI stays form-based in Stage 13 instead of adding a graph editor first.
- Rules UI uses plain static HTML, CSS and JavaScript with no heavy frontend framework.
- Rules UI editing flows go through transport-neutral `RulesApiService` plus `WebRulesAdapter`, not directly through future HTTP handlers.
- Rule mutation support in `LogicService` stays narrow, validated and safety-oriented.
- Graph-based rule editing is postponed until after the narrow form-based editor contract settles.
- FlowService is pulse-based and board-agnostic.
- Protected lifetime flow totals use `StorageService` totalizers instead of ad-hoc persistence.
- FlowService calculates all supported rate modes on every tick and selects one configurable primary published rate.
- Flow UI ships as a runtime-first dashboard before any full descriptor editor.
- Flow UI uses plain static HTML, CSS and JavaScript with no heavy frontend framework.
- Flow UI list/detail flows go through transport-neutral `FlowApiService` plus `WebFlowAdapter`.
- Flow descriptor editing is postponed until a shared config-adapter layer and safe source catalog exist.
- Flow trend rendering stays lightweight with simple embeddable SVG/canvas-style presentation.
- `flow.<id>.raw_pulse_lifetime` is published as a string signal so full `uint64` lifetime counts remain stable.
- PID Stage 16 starts with a standalone host-testable `PidCore` instead of jumping directly to a runtime `PIDService`.
- PID computation uses explicit caller-supplied `now_ms` and must not read a wall clock internally.
- Stage 16 supports derivative-on-measurement only; derivative-on-error is postponed.
- PID deadband zeroes effective error for proportional and integral action only; derivative still reacts to measurement deltas on eligible updates.
- Stage 17 adds `PIDService` as the runtime wrapper over standalone `PidCore`.
- Stage 17 keeps PID output targets PWM-only for the MVP runtime integration.
- PV/SP source failures become deterministic runtime faults inside `PIDService`.
- Stage 17 runtime faults are non-latching and clear automatically once sources recover on a later tick.
- PID UI/API/MQTT work remains postponed beyond Stage 17.
- Stage 18 adds `MotorService` as a higher-level abstraction over existing `ActuatorManager` targets instead of adding a second PWM layer.
- Stage 18 requires one PWM actuator target per motor; enable and direction targets remain optional relay targets.
- Stage 18 keeps motor runtime faults non-latching; once the fault input clears, the motor returns to `stopped` and requires a fresh run command.
- Stage 18 keeps DC motor control open-loop only; closed-loop speed control remains postponed.
- Stage 19 adds `StepperService` as a specialized runtime service above `StepperHal` plus `SignalRegistry` instead of routing stepper commands through `ActuatorManager`.
- Generic `ActuatorManager` arbitration for stepper targets is postponed until more than one runtime producer needs to command the same axis.
- Stage 19 makes `home_required_on_boot` explicit: when enabled, move and jog commands are rejected until homing completes.
- Stage 19 accepts open-loop commanded position tracking as the MVP tradeoff for stepper mechanisms; encoder-backed absolute position remains postponed.
- Stage 20 adds a Program Builder Wizard that creates safe skeletons, not full application templates.
- Stage 20 generated programs are always created disabled for review and do not auto-start.
- Stage 20 uses runtime catalogs from `SignalRegistry`, `ActuatorManager`, `TimerService`, `AlarmService` and `SequenceService`, not direct GPIO mapping.
- Full template engine behavior, custom step editing and output matrix editing remain postponed beyond Stage 20.

## Stage 23 Template Engine

- Templates generate runtime bundles across multiple existing services instead of building only one sequence program.
- Template apply is denied while any Sequence program is active.
- Generated programs, rules and PID controllers are always created disabled in Stage 23.
- Template apply must rollback already-created artifacts if registration fails partway through.
- Burner and incinerator templates remain supervisory-only skeleton bundles in Stage 23.
- Template unapply/delete is postponed beyond Stage 23.

## Stage 24 MQTT bridge

- MQTT integration starts as a transport-neutral bridge/service before any real ESP32 client/backend is added.
- Stage 24 uses scalar topic-per-field payloads instead of JSON-heavy runtime documents.
- Home Assistant discovery is postponed beyond Stage 24.
- Raw relay and raw GPIO remote commands are intentionally excluded from the first MQTT command surface.
- MQTT commands delegate to existing runtime services instead of duplicating runtime business logic.

## Stage 25 local display layer

- The built-in OLED on the LILYGO T3 V1.6.1 board is the primary local display target for the MVP display layer.
- Stage 25 keeps the display model text-first instead of introducing pixel graphics first.
- `DisplayService` is transport-neutral and host-side testable before any real SSD1306 backend is added.
- The real SSD1306 / I2C hardware backend is postponed to hardware bring-up.
- Alarm override preempts normal screen rotation whenever trip or safety alarms are active.

## Stage 26 simulator and integration harness

- Stage 26 adds a deterministic host-side simulator as an integration layer outside the main runtime architecture.
- Simulator time is explicit and caller-driven through `SimClock`; there is no hidden wall clock, sleep or thread dependency.
- Plant models are engineering approximations for test coverage, not accurate equipment physics.
- Template-generated bundles are exercised in integration scenarios instead of being duplicated manually.
- Hardware bring-up and any real hardware backend remain a separate next stage after simulator coverage.

## Stage 27 hardware bring-up

- Stage 27 uses LILYGO T3 V1.6.1 / LoRa32 V2.1.6 as the first real ESP32 bring-up board.
- The target build uses PlatformIO with `platform = espressif32`, `board = esp32dev`, `framework = espidf`.
- Real ESP32 HAL backends now exist for relay, digital input, analog input, PWM, pulse input and display.
- The built-in OLED is now part of bring-up validation through a narrow SSD1306-compatible text backend.
- Stage 27b adds a local typed bring-up Wi-Fi config instead of a full runtime network/config stack.
- Stage 27b default STA preset is `Infinity-Starlink`; STA/AP names stay configurable in code/build flags.
- Stage 27b OLED default is IP-only with priority `STA IP > AP IP > ---`; SSID and AP name stay hidden unless explicitly enabled later.
- Stage 27b treats flash-size mismatch as a visible bring-up warning/gate and does not silently ignore `Expected 4MB, found 2MB` style warnings.
- LoRa and SD remain reserved board resources and are still unused in the Stage 27 runtime.
- Stepper real hardware backend remains postponed beyond this bring-up PR.
- External bring-up test pins stay optional and unbound by default.
- Safe boot is mandatory: no automatic runtime program/rule/PID start and no default assertion of unbound outputs.

## Stage 28 bench/web layer

- Stage 28 adds a minimal embedded HTTP server on the ESP32 target instead of postponing all browser validation further.
- The on-device page set is intentionally limited to dashboard, flow and rules.
- Rules stay read-only on hardware in Stage 28 even though transport-neutral mutation contracts already exist.
- Browser-issued commands stay narrow: dashboard start/stop/trip/reset plus flow batch control only.
- No raw relay or raw GPIO browser commands are allowed.
- Bench mode remains optional and disabled by default.
- All bench validation procedures stay USB-powered and low-voltage only.
- Reserved LILYGO pins must continue to be rejected explicitly during bench wiring.
- Stage 28 uses a dedicated `1500K` app partition file for the web target instead of broadening the generic bring-up target.

## Stage 30 RC freeze

- Stage 30 freezes the supported release-candidate surface at dashboard, flow and read-only rules on device plus the existing runtime services already merged by Stage 29.
- No new major runtime architecture, UI pages, transport protocols or hardware features are added in Stage 30.
- The existing PlatformIO env names remain unchanged for RC continuity: `lilygo_t3_v161_bringup` and `lilygo_t3_v161_bench_web`.
- `lilygo_t3_v161_bringup` stays in CI as the Stage 27 regression compile target.
- `lilygo_t3_v161_bench_web` stays in CI as the Stage 29/30 browser-and-bench compile target.
- The MQTT layer remains transport-neutral and mock-backed; Stage 30 does not add a real broker client.
- Burner and incinerator templates remain supervisory-only and are not recast as field-ready burner-management logic.
- Low-voltage USB bench validation remains the only supported hardware validation path in this RC.
