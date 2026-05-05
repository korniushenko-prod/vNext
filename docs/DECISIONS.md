# Decisions

## Initial architecture decisions

- Firmware target: ESP32-C3
- Firmware framework: ESP-IDF
- Core runtime style: portable C/C++ modules where possible
- Hardware access: only through HAL
- Web UI: static embedded Web UI served by firmware
- Config format: JSON-like structured config
- Runtime logic: data-driven configuration, not hardcoded application algorithms
- Testing: host-side unit tests with mock HAL and fake clock

## Product decisions

- Templates generate config.
- Runtime executes config.
- No hardcoded application algorithms in runtime.
- UI is mechanics-first.
- Expert mode is allowed but must be validated before apply.
- Host-side tests use mock HAL and fake clock.
- Config model is typed and versioned.
- Validation is host-side testable.
- Runtime will execute validated config only.
- JSON parser and import are postponed.
- Storage is typed and backend-abstracted.
- Storage starts with an in-memory/mock backend before any ESP32 persistence backend.
- Public config serialization/import-export is postponed even though storage has an internal deterministic snapshot format.
- Protected lifetime totalizers survive both normal reset and factory reset.
- `load_best_available_config()` fallback order is active, then backup, then factory default.
