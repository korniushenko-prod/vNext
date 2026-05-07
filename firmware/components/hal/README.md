# HAL Component

Stage 3 introduced portable, mock-first hardware abstraction interfaces for:
- relay outputs
- digital inputs
- analog inputs
- pulse inputs
- PWM outputs
- stepper enable/direction/rate MVP
- display skeleton

Current scope now includes:
- typed C++17 HAL interfaces
- deterministic in-memory/mock implementations
- explicit safe-state behavior
- host-side test support
- Stage 27 board-profile types for LILYGO T3 V1.6.1
- real ESP32 backends for relay, digital input, analog input, PWM, pulse and display bring-up
- a narrow SSD1306-compatible text display path for the built-in OLED

Stage 27 target notes:
- all ESP32 hardware access stays inside `firmware/components/hal/src/esp32_*.cpp`
- reserved pins are enforced through the board profile
- optional external test pins remain unbound by default
- unbound channels fail safe instead of asserting hardware

Still out of scope here:
- LoRa and SD runtime support
- stepper real hardware backend
- target-side networking
- full field IO validation
