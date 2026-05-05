# Storage Tests

These are host-side tests for the Stage 2 storage component.

Coverage in this stage:
- active and backup config slots
- deterministic CRC/integrity fallback
- factory reset semantics
- protected and non-protected totalizer behavior
- typed event log skeleton

These tests intentionally do not require:
- ESP-IDF
- real flash/NVS
- HAL
- runtime modules
