# API Tests

This directory contains host-side tests for the transport-neutral API facades used by the dashboard and Rules UI.

Coverage in this stage includes:
- program-matrix list, detail, active-program and error shaping
- builder catalog, preview and create flows
- builder validation and create-denied error mapping
- program editor list, load, preview, save and error mapping
- program listing and deterministic ordering
- active and inactive program status shaping
- alarm and actuator summary aggregation
- command delegation for start, normal stop, trip and reset
- structured API errors
- bounded history retrieval
- rule list/detail/catalog shaping
- rule create/update/delete/enable/disable mutations
- structured rule validation issue propagation
- flow list/detail/trend/history shaping
- flow batch command delegation
- structured Flow UI result code propagation
- template catalog, schema, preview, apply and error propagation
- rollback failure surfacing for template apply

These tests intentionally do not depend on HTTP, JSON, MQTT or ESP-IDF networking.
