# Storage Component

This component owns typed storage behavior for Stage 2.

Stage 2 scope:
- abstract storage backend interface
- in-memory/mock backend only
- typed active and backup config slots
- deterministic internal config snapshot with CRC32 integrity
- validation-aware load/save/activate flow
- factory reset behavior
- typed protected lifetime totalizers
- lightweight typed event log skeleton

Explicit non-goals for this stage:
- no ESP-IDF backend
- no NVS, flash, FRAM or filesystem persistence
- no JSON import/export
- no runtime config apply
- no flowmeter/runtime logic
- no HAL
- no API or Web UI
