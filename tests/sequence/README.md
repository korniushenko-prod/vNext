# Sequence Tests

Host-side tests for the Stage 9 Sequence Engine MVP.

Coverage in this directory focuses on:
- registration and validation
- start, stop, trip and reset lifecycle
- guard, transition, min-time and timeout behavior
- entry, active and exit action execution
- `SignalRegistry` publication
- bounded in-memory history
- Stage 20 program builder skeleton validation and deterministic generation
- Stage 21 safe program editor admin mutations and draft validation
- Stage 22 output-matrix rows, cells, detail summaries and warning detection

All tests are designed to run without ESP-IDF and without live hardware.
