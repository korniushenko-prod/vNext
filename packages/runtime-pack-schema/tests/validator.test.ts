import { strict as assert } from "node:assert";
import test from "node:test";

import minimalRuntimePack from "./fixtures/minimal-runtime-pack.json" with { type: "json" };
import operationsBadConfirmationPolicyPack from "./fixtures/operations-invalid-bad-confirmation-policy.runtime-pack.json" with { type: "json" };
import operationsExecutionBaselinePack from "./fixtures/operations-execution-baseline.runtime-pack.json" with { type: "json" };
import operationsInvalidRecommendationLifecyclePack from "./fixtures/operations-invalid-recommendation-lifecycle.runtime-pack.json" with { type: "json" };
import operationsMissingOwnerPack from "./fixtures/operations-invalid-missing-owner.runtime-pack.json" with { type: "json" };
import operationsMinimalPack from "./fixtures/operations-minimal.runtime-pack.json" with { type: "json" };
import operationsPidAutotuneExecutionPack from "./fixtures/operations-pid-autotune-execution.runtime-pack.json" with { type: "json" };
import operationsRecommendationPack from "./fixtures/operations-recommendation.runtime-pack.json" with { type: "json" };
import invalidRuntimePack from "./fixtures/runtime-signals-invalid.json" with { type: "json" };
import {
  RUNTIME_PACK_SCHEMA_VERSION,
  WAVE8_EXECUTION_BASELINE_OPERATION_KINDS,
  validateRuntimeOperationSnapshot,
  validateRuntimePack
} from "../src/index.js";

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

test("validateRuntimePack accepts the generic operations runtime spine minimal shape", () => {
  const result = validateRuntimePack(operationsMinimalPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateRuntimePack accepts recommendation-style operation result contracts", () => {
  const result = validateRuntimePack(operationsRecommendationPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateRuntimePack accepts additive execution baseline vocabulary for generic reset operations", () => {
  const result = validateRuntimePack(operationsExecutionBaselinePack);
  assert.equal(result.ok, true);
  assert.deepEqual(
    operationsExecutionBaselinePack.operation_runtime_contract.execution_baseline_kinds,
    [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS]
  );
});

test("validateRuntimePack accepts additive PID autotune execution contract vocabulary", () => {
  const result = validateRuntimePack(operationsPidAutotuneExecutionPack);
  assert.equal(result.ok, true);
  assert.equal(
    operationsPidAutotuneExecutionPack.operation_runtime_contract.recommendation_lifecycle_supported,
    true
  );
  assert.equal(
    operationsPidAutotuneExecutionPack.operations.op_pid_1_autotune.result_contract.recommendation_lifecycle.mode,
    "apply_reject"
  );
});

test("validateRuntimePack rejects operations without owner_instance_id", () => {
  const result = validateRuntimePack(operationsMissingOwnerPack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.operations.op_reset_1.owner_instance_id"));
});

test("validateRuntimePack rejects unknown operation confirmation_policy values", () => {
  const result = validateRuntimePack(operationsBadConfirmationPolicyPack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.operations.op_counter_1_reset.confirmation_policy"));
});

test("validateRuntimePack rejects recommendation lifecycle on non-recommendation result contracts", () => {
  const result = validateRuntimePack(operationsInvalidRecommendationLifecyclePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.path === "$.operations.op_pid_1_autotune.result_contract.recommendation_lifecycle" &&
    entry.code === "runtime_operation.result_contract.recommendation_lifecycle.invalid"
  )));
});

test("validateRuntimeOperationSnapshot accepts additive failure payload and audit hook fields", () => {
  const result = validateRuntimeOperationSnapshot({
    operation_id: "op_run_hours_1_reset_counter",
    state: "failed",
    message: "Execution failed.",
    failure: {
      reason_code: "source_unavailable"
    },
    audit_record_id: "audit-001"
  });

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateRuntimeOperationSnapshot accepts additive PID autotune progress payload and recommendation state fields", () => {
  const result = validateRuntimeOperationSnapshot({
    operation_id: "op_pid_1_autotune",
    state: "running",
    progress: 64,
    progress_payload: {
      phase: "relay_identification",
      sample_count: 18
    },
    recommendation_state: "pending_apply"
  });

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});
