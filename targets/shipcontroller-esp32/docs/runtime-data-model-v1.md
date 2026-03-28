# Runtime Data Model V1

## Purpose

This document translates the architecture into concrete runtime entities.

It defines:

- what objects should exist at runtime
- what fields they must contain
- how they relate to each other
- how the current codebase should evolve toward this model

This is the bridge between architecture and implementation.

## Core Runtime Principle

The runtime must be built around stable inspectable objects, not scattered globals.

The main runtime chain should become:

`resources -> signals -> blocks -> alarms -> sequences -> service/UI`

## Runtime Object Groups

V1 should introduce the following runtime groups:

- resource definitions and resource state
- signal definitions and signal state
- block definitions and block state
- alarm definitions and alarm state
- sequence definitions and sequence state
- service snapshots for UI

## 1. Resource Runtime

Resources represent physical or protocol-level attachment points.

Examples:

- local GPIO DI
- local GPIO DO
- ADC input
- DAC output
- UART port
- RS485 port
- external ADC channel

### Suggested Definition

```cpp
enum class ResourceClass {
    LocalGPIO,
    LocalADC,
    LocalDAC,
    Counter,
    PWM,
    UART,
    RS485,
    RS422,
    ExternalADC,
    ExternalDAC,
    Virtual
};

struct ResourceDefinition {
    String id;
    String label;
    ResourceClass resourceClass;
    int gpio;
    ChannelType capabilities[MAX_RESOURCE_CAPABILITIES];
    int capabilityCount;
    PinPolicyClass safetyClass;
    String owner;
    bool available;
};
```

### Suggested Runtime State

```cpp
struct ResourceState {
    bool initialized;
    bool fault;
    String status;
    uint32_t lastUpdateMs;
};
```

## 2. Signal Runtime

Signals are the universal runtime data objects.

Every meaningful value in the system should become a signal.

### Enumerations

```cpp
enum class SignalClass {
    Binary,
    Analog,
    Counter,
    Enum,
    Text
};

enum class SignalDirection {
    Input,
    Output,
    Internal,
    Command,
    Status
};

enum class SignalSourceType {
    LocalDI,
    LocalDOFeedback,
    LocalAI,
    LocalAOFeedback,
    Counter,
    Frequency,
    ModbusRegister,
    SerialParser,
    CanValue,
    ExternalADC,
    ExternalDAC,
    Virtual,
    Manual,
    Substituted,
    BlockOutput
};

enum class SignalQuality {
    Uninitialized,
    Good,
    Stale,
    Substituted,
    Fault,
    OutOfRange
};

enum class SignalMode {
    Auto,
    Manual,
    Local,
    Remote,
    Service
};
```

### Suggested Definition

```cpp
struct SignalDefinition {
    String id;
    String label;
    SignalClass signalClass;
    SignalDirection direction;
    SignalSourceType sourceType;
    String units;
    String resourceId;
    String producerBlockId;
    bool visibleInUi;
    float minValue;
    float maxValue;
    float defaultValue;
};
```

### Suggested Runtime State

```cpp
struct SignalState {
    float rawValue;
    float engineeringValue;
    float substitutedValue;
    bool boolValue;
    int enumValue;
    SignalQuality quality;
    SignalMode mode;
    bool hasManualOverride;
    bool hasSubstitution;
    bool stale;
    uint32_t timestampMs;
    uint32_t ageMs;
    String statusText;
};
```

### Why Both `rawValue` and `engineeringValue`

This is required for:

- diagnostics
- calibration
- service UI
- signal validation

Example:

- raw ADC count
- converted current
- engineering temperature

## 3. Conditioning Runtime

Conditioning is conceptually part of the signal pipeline, but should still be explicit in config/runtime.

### Suggested Definition

```cpp
enum class ConditioningType {
    Scale,
    Offset,
    Clamp,
    Invert,
    Debounce,
    Hysteresis,
    LowPass,
    MovingAverage,
    RateLimit,
    Plausibility,
    SourceSelect,
    Substitute,
    RangeMap,
    PiecewiseMap
};

struct ConditioningStep {
    ConditioningType type;
    float p1;
    float p2;
    float p3;
    String sourceSignalA;
    String sourceSignalB;
    bool enabled;
};
```

### Suggested Placement

Each signal definition may own a small ordered array of conditioning steps.

That keeps the mental model simple:

`resource -> signal conditioning -> published signal state`

## 4. Block Runtime

Blocks consume signals and produce signals.

### Enumerations

```cpp
enum class BlockFamily {
    Conditioning,
    Selection,
    Logic,
    Comparator,
    Time,
    Control,
    AnalogFunction,
    CounterFlow,
    Alarm,
    Protocol,
    SequenceSupport
};
```

### Suggested Definition

```cpp
struct BlockDefinition {
    String id;
    String type;
    BlockFamily family;
    bool enabled;
    String inputSignals[8];
    int inputCount;
    String outputSignals[4];
    int outputCount;
    float params[16];
    int paramCount;
};
```

### Suggested Runtime State

```cpp
struct BlockState {
    bool initialized;
    bool active;
    bool fault;
    uint32_t lastRunMs;
    float primaryOutput;
    float auxOutput;
    String statusText;
};
```

### Notes

- `PID` will likely require a specialized runtime struct later.
- `Timer` and `Alarm` also benefit from specialized runtime state.
- V1 can still start with a common base state plus per-type extension.

## 5. Alarm Runtime

Alarms should be first-class runtime objects, not only booleans.

### Suggested Enumerations

```cpp
enum class AlarmSeverity {
    Info,
    Warning,
    Trip,
    Lockout
};

enum class AlarmState {
    Normal,
    Active,
    Latched,
    Acknowledged
};
```

### Suggested Definition

```cpp
struct AlarmDefinition {
    String id;
    String label;
    String sourceSignalId;
    AlarmSeverity severity;
    bool latched;
    bool requiresReset;
};
```

### Suggested Runtime State

```cpp
struct AlarmRuntime {
    AlarmState state;
    bool active;
    bool acknowledged;
    uint32_t firstActiveMs;
    uint32_t lastChangeMs;
    String message;
};
```

## 6. Sequence Runtime

Sequences are explicit state machines for mechanisms such as boilers and incinerators.

### Suggested Definitions

```cpp
struct SequenceTransition {
    String targetStateId;
    String conditionSignalId;
    bool expectedValue;
    uint32_t minElapsedMs;
};

struct SequenceStateDefinition {
    String id;
    String label;
    String permissiveSignalIds[8];
    int permissiveCount;
    String tripSignalIds[8];
    int tripCount;
    String forcedOutputSignalIds[8];
    int forcedOutputCount;
    SequenceTransition transitions[8];
    int transitionCount;
};

struct SequenceDefinition {
    String id;
    String label;
    SequenceStateDefinition states[16];
    int stateCount;
    String initialStateId;
};
```

### Suggested Runtime State

```cpp
struct SequenceRuntime {
    bool active;
    bool fault;
    bool lockout;
    String currentStateId;
    String requestedStateId;
    uint32_t stateEnteredMs;
    uint32_t elapsedInStateMs;
    String lastFaultReason;
};
```

## 7. Event Runtime

Events are needed for serviceability and debugging.

### Suggested Event Types

- alarm change
- mode change
- state transition
- substitution enabled
- config applied
- communication loss
- manual force action

### Suggested Event Record

```cpp
struct EventRecord {
    uint32_t timestampMs;
    String category;
    String objectId;
    String message;
};
```

## 8. Service Snapshot Model

The UI should not reconstruct system state from random sources.

The runtime should provide service-oriented snapshots.

### Suggested Snapshots

- hardware snapshot
- signal snapshot
- block snapshot
- alarm snapshot
- sequence snapshot
- communication snapshot

This can initially be produced from current runtime managers and later formalized.

## Suggested Managers

Based on this model, the runtime should evolve toward these managers:

- `ResourceManager`
- `SignalRegistry`
- `ConditioningEngine`
- `BlockEngine`
- `AlarmManager`
- `SequenceEngine`
- `EventLog`
- `ServiceRuntime`

## Recommended File Layout

The current project can evolve toward the following structure.

```text
src/
├── runtime/
│   ├── signal_types.h
│   ├── signal_definition.h
│   ├── signal_state.h
│   ├── signal_registry.h/.cpp
│   ├── block_definition.h
│   ├── block_state.h
│   ├── alarm_definition.h
│   ├── alarm_state.h
│   ├── sequence_definition.h
│   ├── sequence_state.h
│
├── engines/
│   ├── conditioning_engine.h/.cpp
│   ├── block_engine.h/.cpp
│   ├── alarm_manager.h/.cpp
│   ├── sequence_engine.h/.cpp
│   ├── service_runtime.h/.cpp
│
├── blocks/
│   ├── pid_block.h/.cpp
│   ├── timer_block.h/.cpp
│   ├── comparator_block.h/.cpp
│   ├── selector_block.h/.cpp
│   ├── alarm_block.h/.cpp
```

## Mapping From Current Codebase

Current to future mapping:

- `resource_manager.*`
  becomes the physical resource layer
- current `channels` config
  evolves into signal definitions
- `timer.cpp`
  becomes `timer_block`
- `flowmeter.cpp`
  becomes counter/flow block or signal producer
- `data_registry.*`
  should eventually be replaced or wrapped by `SignalRegistry`
- `board_manager.*`
  remains as hardware/template resolver

## Migration Path

### Step 1

Introduce the runtime type headers only:

- signal enums
- signal definitions
- signal state
- block base definitions

No behavior changes yet.

### Step 2

Add a `SignalRegistry` in parallel with current `DataRegistry`.

Use it first for:

- channel runtime state
- diagnostics output
- service UI

### Step 3

Move the existing timer module into the new block model.

### Step 4

Introduce the first conditioning blocks:

- scale
- clamp
- debounce
- hysteresis
- selector
- substitute

### Step 5

Introduce alarm runtime and sequence runtime.

## Immediate Practical Next Step

The next implementation step after this document should be:

1. add runtime type headers
2. create a minimal `SignalRegistry`
3. mirror current channel values into signals
4. expose signals in Web UI as the primary service object

This creates the smallest useful bridge from the current architecture to the target platform model.
