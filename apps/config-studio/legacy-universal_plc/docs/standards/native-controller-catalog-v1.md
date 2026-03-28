# Native Controller Catalog v1

Official MVP native controllers:

## Groups

- `DemandGroup`
- `PermissiveGroup`
- `TripGroup`
- `AlarmGroup`

## Safety

- `AlarmObject`
- `TripLatch`
- `InterlockBlock`
- `ExternalAlarmRelay`

## Process Controllers

- `PumpPairController`
- `SequenceController`
- `StateMachineController`
- `ValveController`
- `ManualModeController`
- `ModeSelectorController`
- `DutySelectorController`

## Foundation

- `TimerBlock`
- `EdgeDetector`
- `DebounceBlock`
- `FilterBlock`
- `CompareBlock`
- `LatchBlock`

Native controllers must have:

- a stable typed interface
- deterministic runtime behavior
- explain/debug support
- a standard config schema
- compact, interface and runtime views
