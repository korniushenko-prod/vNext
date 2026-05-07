# Display Component

Stage 25 adds a transport-neutral `DisplayService` for the local OLED status layer.

Current scope:
- typed display descriptor, frame, snapshot, history and result models
- compact text-first screen builders for `main`, `program`, `flow`, `pid`, `alarms` and `mqtt`
- deterministic screen rotation and alarm override
- `DisplayHAL` rendering with a line-based contract
- `SignalRegistry` publication and bounded in-memory history
- host-side testability through `MockDisplayHal`

Intentionally postponed:
- real SSD1306 / I2C backend
- pixel graphics, fonts, bitmaps and icons
- button-driven navigation
- HTTP, Web UI or MQTT display control
