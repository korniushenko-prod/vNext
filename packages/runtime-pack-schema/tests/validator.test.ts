import { strict as assert } from "node:assert";
import test from "node:test";

import minimalRuntimePack from "./fixtures/minimal-runtime-pack.json" with { type: "json" };
import invalidRuntimePack from "./fixtures/runtime-signals-invalid.json" with { type: "json" };
import { RUNTIME_PACK_SCHEMA_VERSION, validateRuntimePack } from "../src/index.js";

test("validateRuntimePack accepts canonical minimal runtime pack", () => {
  const result = validateRuntimePack(minimalRuntimePack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateRuntimePack rejects signals in runtime pack", () => {
  const result = validateRuntimePack(invalidRuntimePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "runtime_pack.signals.forbidden"));
});

test("validateRuntimePack enforces canonical runtime schema version", () => {
  const mutated = {
    ...minimalRuntimePack,
    schema_version: "0.0.9"
  };
  const result = validateRuntimePack(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.schema_version"));
  assert.equal(RUNTIME_PACK_SCHEMA_VERSION, "0.1.0");
});

test("validateRuntimePack accepts native execution metadata and empty ops/trace groups", () => {
  const result = validateRuntimePack(minimalRuntimePack);
  assert.equal(result.ok, true);
});

test("validateRuntimePack accepts capability hardening metadata blocks", () => {
  const mutated = structuredClone(minimalRuntimePack) as any;
  mutated.operations.op_relay_1_reset = {
    id: "op_relay_1_reset",
    owner_instance_id: "relay_1",
    kind: "reset_totalizer",
    title: "Reset Totalizer",
    ui_hint: "danger",
    safe_when: ["stopped"],
    confirmation_policy: "required",
    progress_signals: [{ instance_id: "relay_1", port_id: "is_on" }],
    result_fields: ["done"],
    state_hint: {
      availability: "guarded",
      progress_style: "signals",
      destructive: true
    },
    provenance: {
      owner_instance_id: "relay_1",
      facet_kind: "operation",
      facet_id: "reset",
      source_type_ref: "project:relay_controller"
    }
  };
  mutated.trace_groups.tg_relay_1_debug = {
    id: "tg_relay_1_debug",
    owner_instance_id: "relay_1",
    title: "Debug",
    signals: [{ instance_id: "relay_1", port_id: "is_on" }],
    sample_hint_ms: 250,
    chart_hint: "line",
    provenance: {
      owner_instance_id: "relay_1",
      facet_kind: "trace_group",
      facet_id: "debug",
      source_type_ref: "project:relay_controller"
    }
  };
  mutated.monitors.mon_relay_1_timeout = {
    id: "mon_relay_1_timeout",
    owner_instance_id: "relay_1",
    kind: "timeout",
    title: "Timeout",
    source_ports: [{ instance_id: "relay_1", port_id: "is_on" }],
    severity: "warning",
    status_port_id: "is_on",
    config: { timeout_ms: 1000 },
    provenance: {
      owner_instance_id: "relay_1",
      facet_kind: "monitor",
      facet_id: "timeout",
      source_type_ref: "project:relay_controller"
    }
  };
  mutated.frontend_requirements.fe_relay_1_source = {
    id: "fe_relay_1_source",
    owner_instance_id: "relay_1",
    kind: "pulse_input",
    mode: "hall_pulse",
    title: "Source",
    source_ports: [{ instance_id: "relay_1", port_id: "cmd_on" }],
    binding_kind: "digital_in",
    channel_kind: "signal",
    value_type: "bool",
    required: true,
    config: { debounce_ms: 20 },
    provenance: {
      owner_instance_id: "relay_1",
      facet_kind: "frontend_requirement",
      facet_id: "source",
      source_type_ref: "project:relay_controller"
    }
  };
  mutated.persistence_slots.ps_relay_1_total = {
    id: "ps_relay_1_total",
    owner_instance_id: "relay_1",
    slot_kind: "counter",
    title: "Totalizer",
    owner_param_id: "pulse_time_ms",
    nv_slot_hint: "nv.totalizer",
    flush_policy: "on_change",
    provenance: {
      owner_instance_id: "relay_1",
      facet_kind: "persistence_slot",
      facet_id: "total",
      source_type_ref: "project:relay_controller"
    }
  };

  const result = validateRuntimePack(mutated);
  assert.equal(result.ok, true);
});
