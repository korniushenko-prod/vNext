# SignalRegistry Tests

Host-side tests for the Stage 4 SignalRegistry cover:
- descriptor registration and deterministic listing
- typed reads and typed write enforcement
- structured error handling
- stale calculation from explicit `now_ms`
- writable virtual signal behavior

These tests intentionally avoid hardware, ESP-IDF and runtime execution logic.
