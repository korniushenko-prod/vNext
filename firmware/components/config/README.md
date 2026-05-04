# Config Component

This component owns the typed and versioned configuration model for the controller.

Stage 1 scope:
- typed configuration structs and enums
- safe factory defaults
- structured validation with aggregated issues
- host-side testability
- no ESP-IDF dependency in config or validation code

Explicit non-goals for this stage:
- no JSON parser
- no serialization
- no runtime execution
- no HAL
- no API
- no Web UI
