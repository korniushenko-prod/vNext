# Web Component

Stage 28 adds a minimal on-device web binding for the ESP32 hardware target.

Scope:
- embedded `esp_http_server` binding
- static asset serving for `dashboard`, `flow`, and `rules`
- route glue to `WebDashboardAdapter`, `WebFlowAdapter`, and `WebRulesAdapter`
- read-only rules page on hardware for this stage

Out of scope:
- auth or TLS
- MQTT UI
- rule/program/template editing on hardware
- LoRa or SD integration
