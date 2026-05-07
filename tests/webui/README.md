# Web UI Tests

This directory contains host-side tests for the dashboard and Rules UI adapter layers.

Scope:
- `WebProgramMatrixAdapter` list/detail aggregation
- Program Matrix view-model shaping for read-only rows, warnings, legend and state detail switching
- `WebProgramBuilderAdapter` catalog/preview/create aggregation
- Program Builder wizard view-model shaping for required bindings, preview states and disabled-create notes
- `WebProgramEditorAdapter` list/detail/preview aggregation
- Program Editor view-model shaping for metadata, runtime read-only state and command flags
- `WebDashboardAdapter` transport-neutral command and data aggregation
- dashboard view-model shaping for blockers, alarms, actuators and history
- `WebRulesAdapter` list/detail/command aggregation
- Rules editor view-model shaping for nested conditions, action sections, trace and validation issues
- `WebFlowAdapter` list/detail/trend/history/batch aggregation
- Flow runtime view-model shaping for badges, protected totals and empty states
- `WebTemplateAdapter` catalog/schema/preview aggregation
- Template view-model shaping for required bindings, disabled-by-default notes and supervisory warnings
- no ESP-IDF HTTP server dependency
- no frontend framework dependency

The browser assets remain intentionally simple and are not unit tested here.
The important test surface for this stage is the C++ adapter/view-model contract that future HTTP binding will serialize.
