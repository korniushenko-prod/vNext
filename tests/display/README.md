# Display Tests

Host-side tests for Stage 25 cover:
- text-oriented screen building for `main`, `program`, `flow`, `pid`, `alarms` and `mqtt`
- deterministic line truncation and OLED-sized formatting
- screen rotation, manual navigation and alarm override
- `DisplayHAL` rendering integration through `MockDisplayHal`
- `SignalRegistry` publication and stable display error surfaces
