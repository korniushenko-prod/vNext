# Tests

This directory is reserved for host-side unit tests, integration scaffolding and future simulated validation.

The current test surface is active and CI-backed:
- mock HAL
- fake/explicit time
- deterministic host-side unit tests by runtime area
- simulator scenarios for multi-service regression
- no dependence on live hardware for core runtime validation

Current host-side suites:
- `tests/config`
- `tests/storage`
- `tests/hal`
- `tests/signals`
- `tests/actuators`
- `tests/timers`
- `tests/alarms`
- `tests/conditions`
- `tests/logic`
- `tests/sequence`
- `tests/api`
- `tests/webui`
- `tests/flow`
- `tests/pid`
- `tests/mqtt`
- `tests/display`
- `tests/sim`

Stage 13 expands the host-side surface with:
- Rules API list/detail/catalog and mutation tests in `tests/api`
- Rules UI adapter and editor view-model tests in `tests/webui`
- narrow LogicService admin mutation tests in `tests/logic/test_logic_service_admin.cpp`

Stage 14 expands the host-side surface with:
- dedicated `FlowService` tests in `tests/flow`
- protected totalizer integration, rate-mode, batch, signal, trend and error coverage

Stage 15 expands the host-side surface with:
- Flow API list/status/command/error/trend tests in `tests/api`
- Flow UI adapter and view-model tests in `tests/webui`

Stage 16 expands the host-side surface with:
- dedicated standalone PID core tests in `tests/pid`
- convergence, limit, mode, fault and bumpless-transfer coverage with no runtime-service dependency

Stage 17 expands the host-side surface with:
- dedicated `PidService` runtime tests in `tests/pid`
- `SignalRegistry` + `ActuatorManager` integration coverage
- runtime mode, fault-policy, publication and history coverage

Stage 18 expands the host-side surface with:
- dedicated `MotorService` runtime tests in `tests/actuators`
- open-loop run/speed/direction timing coverage
- fault/tach integration, signal publication and bounded history coverage

Stage 19 expands the host-side surface with:
- dedicated `StepperService` runtime tests in `tests/actuators`
- homing, move/jog, limit/fault and signal publication coverage
- deterministic open-loop position tracking and bounded history coverage

Stage 20 expands the host-side surface with:
- dedicated Program Builder skeleton generation tests in `tests/sequence`
- builder catalog, preview, create and error tests in `tests/api`
- wizard-oriented Program Builder adapter/view-model tests in `tests/webui`

Stage 21 expands the host-side surface with:
- SequenceService admin mutation tests for safe replace, delete and enable flows
- Program Editor validation coverage for immutable ids, special states and target references
- Program Editor API load, preview, save and error propagation tests
- Program Editor Web adapter and view-model contract coverage

Stage 22 expands the host-side surface with:
- dedicated `ProgramMatrixBuilder` coverage for rows, cells and warnings
- matrix API list/detail/error coverage
- matrix Web adapter and view-model coverage for row highlight, legend and detail-panel mapping

Stage 23 expands the host-side surface with:
- dedicated `TemplateEngine` catalog, validation, generation, apply and rollback coverage in `tests/templates`
- template catalog, preview, apply and error coverage in `tests/api`
- template Web adapter and view-model coverage in `tests/webui`

Stage 24 expands the host-side surface with:
- dedicated MQTT mapper, publish, command, error and history coverage in `tests/mqtt`
- deterministic mock-backend validation with no real broker dependency

Stage 25 expands the host-side surface with:
- dedicated `DisplayService` screen, rotation, override and error coverage in `tests/display`
- deterministic OLED-oriented text rendering checks through `MockDisplayHal`

Stage 26 expands the host-side surface with:
- deterministic simulator component coverage in `tests/sim`
- end-to-end template, sequence, logic, PID, flow, MQTT and display smoke scenarios through `SimHarness`
- simple host-side pressure, pulse-flow, burner and incinerator plant/harness coverage
