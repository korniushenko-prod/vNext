# API Component

The API component keeps the transport-neutral service-and-adapter approach and now covers the program dashboard, rules/editor flows, flow runtime pages, program builder/editor surfaces and the Stage 23 Template Engine surface.

This component owns:
- typed API DTOs for program lists, status, commands and history
- stable API-layer result and error codes
- `SequenceApiService` as a thin facade over `SequenceService`
- `WebDashboardAdapter` as a dashboard-focused adapter over `SequenceApiService`
- `ProgramMatrixApiService` as a thin facade over `ProgramMatrixBuilder` plus `SequenceService`
- `WebProgramMatrixAdapter` as a matrix-focused adapter over `ProgramMatrixApiService`
- `ProgramBuilderApiService` as a thin facade over `ProgramSkeletonBuilder` plus runtime catalogs
- `WebProgramBuilderAdapter` as a wizard-focused adapter over `ProgramBuilderApiService`
- `ProgramEditorApiService` as a thin facade over safe sequence editor admin mutations
- `WebProgramEditorAdapter` as a form-editor-focused adapter over `ProgramEditorApiService`
- `RulesApiService` as a thin facade over `LogicService`
- `WebRulesAdapter` as a rules-editor-focused adapter over `RulesApiService`
- `FlowApiService` as a thin facade over `FlowService`
- `WebFlowAdapter` as a flow-runtime-focused adapter over `FlowApiService`
- `TemplateApiService` as a thin facade over `TemplateEngine` plus runtime catalogs and services
- `WebTemplateAdapter` as a template-wizard-focused adapter over `TemplateApiService`
- aggregated status views that include alarm and actuator summaries
- host-side-testable command validation and response shaping

This stage intentionally does not include:
- HTTP routing or sockets
- JSON serialization or parsing
- ESP-IDF networking
- generic Web UI framework code
- MQTT

See:
- [docs/API.md](../../../docs/API.md)
- [docs/PROGRAM_BUILDER.md](../../../docs/PROGRAM_BUILDER.md)
- [docs/PROGRAM_EDITOR.md](../../../docs/PROGRAM_EDITOR.md)
- [docs/WEB_DASHBOARD.md](../../../docs/WEB_DASHBOARD.md)
- [docs/RULES_UI.md](../../../docs/RULES_UI.md)
- [docs/FLOW_UI.md](../../../docs/FLOW_UI.md)
