# Display

## Purpose

Stage 25 adds `DisplayService` as a transport-neutral local status layer.
Stage 27 then binds that layer to the built-in SSD1306-oriented OLED on the LILYGO T3 V1.6.1 bring-up target.

The RC display surface is meant to answer:
- what mode the controller is in
- what program/state is active
- whether flow, PID, alarms or MQTT need attention
- what IP to open for on-device browser access

## Current RC scope

Supported display behavior:
- compact text-first screens for `main`, `program`, `flow`, `pid`, `alarms` and `mqtt`
- deterministic rotation through `DisplayService`
- trip/safety alarm override of normal rotation
- bounded display history
- host-side tests through `MockDisplayHal`
- real OLED bring-up rendering on LILYGO through `DisplayHAL`

Bring-up and bench policy:
- OLED network display stays IP-first with `STA IP > AP IP > ---`
- the display remains a local status surface, not a config editor
- bench mode signage is informational only

## Current limits

The RC does not add:
- graphical HMI pages on the OLED
- touch input
- generic on-device editing
- alternate display controller backends

The OLED is a local read-only diagnostics surface that complements the browser dashboard.
