const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mapOperationDetails,
  mapOperationListItems
} = require("../../src/operations/contracts/operation-ui-mappers");
const {
  maintenancePack,
  metadataOnlySupport,
  pidAutotunePack,
  pidPack,
  timedRelayPack
} = require("./fixtures");

const executionBaselineSupport = {
  enabled: true,
  invoke: true,
  cancel: true,
  progress: true,
  result_payload: true,
  confirmation: true,
  execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
  confirmation_token_validation: "when_required",
  failure_payload: true,
  audit_hooks: true,
  recommendation_lifecycle: true,
  progress_payload: true
};

const executionBaselineRuntimeContract = {
  invoke_supported: true,
  cancel_supported: false,
  progress_supported: true,
  result_supported: true,
  audit_required: true,
  execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
  confirmation_token_validation: "when_required",
  failure_payload_supported: true,
  audit_hook_mode: "operation_events"
};

test("execution baseline operation without snapshot maps to available and runnable when availability is unconditional", () => {
  const pack = structuredClone(timedRelayPack);
  pack.operations.op_relay_1_reset.kind = "reset_counter";
  pack.operation_runtime_contract = executionBaselineRuntimeContract;

  const items = mapOperationListItems({
    runtimePack: pack,
    operationsSupport: executionBaselineSupport
  });

  const reset = items.find((item) => item.id === "op_relay_1_reset");
  assert.equal(reset.lifecycle_state, "available");
  assert.equal(reset.primary_intent.enabled, true);
  assert.equal(reset.metadata_only, false);
  assert.equal(reset.execution.runnable, true);
});

test("execution baseline operation with guarded availability stays blocked until guard conditions are satisfied", () => {
  const details = mapOperationDetails({
    runtimePack: maintenancePack,
    operationId: "op_maintenance_counter_1_reset_interval",
    operationsSupport: executionBaselineSupport
  });

  assert.equal(details.lifecycle_state, "blocked");
  assert.equal(details.confirmation.required, true);
  assert.equal(details.availability.blocked, true);
  assert.equal(details.execution.runnable, false);
  assert.ok(details.ui_sections.includes("confirmation_required"));
});

test("running snapshot maps into progress vm and running lifecycle", () => {
  const runtimeSnapshot = {
    operation_snapshots: {
      op_pid_1_hold: {
        operation_id: "op_pid_1_hold",
        state: "running",
        progress: 55,
        message: "Hold in progress"
      }
    }
  };

  const details = mapOperationDetails({
    runtimePack: pidPack,
    operationId: "op_pid_1_hold",
    runtimeSnapshot,
    operationsSupport: metadataOnlySupport
  });

  assert.equal(details.lifecycle_state, "running");
  assert.equal(details.progress.visible, true);
  assert.equal(details.progress.percent, 55);
  assert.equal(details.progress.mode, "signal_based");
});

test("completed snapshot maps into result summary vm", () => {
  const runtimeSnapshot = {
    operation_snapshots: {
      op_maintenance_counter_1_reset_interval: {
        operation_id: "op_maintenance_counter_1_reset_interval",
        state: "completed",
        result: {
          completed: true,
          remaining_out: 500,
          progress_out: 0
        }
      }
    }
  };

  const details = mapOperationDetails({
    runtimePack: maintenancePack,
    operationId: "op_maintenance_counter_1_reset_interval",
    runtimeSnapshot,
    operationsSupport: metadataOnlySupport
  });

  assert.equal(details.lifecycle_state, "completed");
  assert.equal(details.result_summary.visible, true);
  assert.equal(details.result_summary.mode, "applyable_result");
  assert.deepEqual(
    details.result_summary.fields.map((field) => field.id),
    ["completed", "remaining_out", "progress_out"]
  );
});

test("pid autotune maps as a specialized runnable lane with recommendation lifecycle metadata", () => {
  const details = mapOperationDetails({
    runtimePack: pidAutotunePack,
    operationId: "op_pid_1_autotune",
    runtimeSnapshot: {
      operation_snapshots: {
        op_pid_1_autotune: {
          operation_id: "op_pid_1_autotune",
          state: "completed",
          recommendation_state: "available",
          progress_payload: {
            phase: "settle",
            sample_count: 128
          },
          result: {
            recommended_kp: 1.9,
            recommended_ti: 10.5,
            recommended_td: 0.2,
            summary: "Stable relay test complete."
          }
        }
      }
    },
    operationsSupport: executionBaselineSupport
  });

  assert.equal(details.metadata_only, false);
  assert.equal(details.kind, "autotune");
  assert.equal(details.primary_intent.enabled, false);
  assert.equal(details.execution.specialized_kind, "pid_autotune");
  assert.equal(details.execution.lane, "pid_autotune");
  assert.equal(details.result_summary.mode, "recommendation");
  assert.equal(details.result_summary.recommendation_state, "available");
  assert.equal(details.progress.payload.phase, "settle");
});

test("non-baseline kinds remain metadata-only even when target execution baseline exists", () => {
  const details = mapOperationDetails({
    runtimePack: pidPack,
    operationId: "op_pid_1_hold",
    operationsSupport: executionBaselineSupport
  });

  assert.equal(details.metadata_only, true);
  assert.equal(details.execution.runnable, false);
  assert.equal(details.execution.reason, "metadata_only");
});

test("unknown snapshot state falls back to stale instead of breaking mapping", () => {
  const details = mapOperationDetails({
    runtimePack: pidPack,
    operationId: "op_pid_1_hold",
    runtimeSnapshot: {
      operation_snapshots: {
        op_pid_1_hold: {
          operation_id: "op_pid_1_hold",
          state: "mystery_state"
        }
      }
    },
    operationsSupport: metadataOnlySupport
  });

  assert.equal(details.lifecycle_state, "stale");
});

test("missing confirmation metadata falls back safely to none", () => {
  const pack = structuredClone(timedRelayPack);
  delete pack.operations.op_relay_1_reset.confirmation_policy;

  const details = mapOperationDetails({
    runtimePack: pack,
    operationId: "op_relay_1_reset",
    operationsSupport: metadataOnlySupport
  });

  assert.equal(details.confirmation.required, false);
  assert.equal(details.confirmation.policy, "none");
});

test("unsupported progress mode falls back predictably to none", () => {
  const pack = structuredClone(pidPack);
  pack.operations.op_pid_1_hold.progress_mode = "device_magic";

  const details = mapOperationDetails({
    runtimePack: pack,
    operationId: "op_pid_1_hold",
    runtimeSnapshot: {
      operation_snapshots: {
        op_pid_1_hold: {
          operation_id: "op_pid_1_hold",
          state: "running",
          progress: 10
        }
      }
    },
    operationsSupport: metadataOnlySupport
  });

  assert.equal(details.progress.mode, "none");
  assert.equal(details.progress.fallback, true);
});
