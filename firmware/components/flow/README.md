# Flow Component

Stage 14 introduces the portable `FlowService` runtime component for pulse-based flow measurement and totalizing.

This component provides:
- typed flow descriptors, runtime state, snapshots, trend buckets and history entries
- pulse-count integration through `PulseInputHal`
- protected lifetime raw-pulse and volume totals through `StorageService`
- time-window, pulse-frequency and avg-last-n-pulses rate modes
- batch runtime, trip total, no-flow/high-flow status and SignalRegistry publication
- deterministic bounded in-memory history plus bounded trend storage

This stage intentionally does not include:
- Flow UI
- HTTP API, Web UI transport or MQTT
- fuel correction, reverse flow or commercial metering features
- direct output control on batch completion
- real FRAM/NVS persistence backends
