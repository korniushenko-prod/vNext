# Sequence Component

Stage 9 introduces the first MVP of the generic Sequence Engine.

This component owns:
- typed sequence program, state, transition and action descriptors
- typed Stage 20 program-builder draft, catalog and preview models
- typed Stage 21 program-editor draft, catalog and preview models
- typed Stage 22 program-matrix descriptor, cell and warning models
- `ProgramSkeletonBuilder` for safe skeleton generation
- `ProgramMatrixBuilder` for read-only output-matrix visualization and review
- safe admin mutations for existing registered programs
- program validation before registration
- one-active-program runtime execution
- state entry, active and exit semantics
- guard and transition evaluation through `ConditionTree`
- normal stop, trip, timeout and lockout branching
- `ActuatorManager`, `TimerService`, `AlarmService` and `SignalRegistry` integration
- bounded in-memory history and runtime snapshots

This stage intentionally does not include:
- HTTP API
- Web UI
- MQTT
- full template generation or custom editor tooling
- config adapter/import parser
- multi-program parallel runtime
- persistence of program runtime or history

See [docs/SEQUENCE.md](../../../docs/SEQUENCE.md) for the public behavior contract.
