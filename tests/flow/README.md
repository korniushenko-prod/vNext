# Flow Tests

Host-side tests for Stage 14 `FlowService`.

Coverage focus:
- descriptor validation and registration
- protected totalizer load/save semantics through `StorageService`
- pulse delta counting, rate modes and status flags
- batch runtime, bounded history and bounded trend buffering
- SignalRegistry publication and structured error handling
